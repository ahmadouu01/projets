# -*- coding: utf-8 -*-
"""Tests des règles de gestion de SunuERP (bibliothèque standard : unittest)."""
import os
import sys
import tempfile
import unittest
from datetime import date

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE)
_TMP = tempfile.mkdtemp(prefix="sunuerp-test-")
os.environ["SUNUERP_DB"] = os.path.join(_TMP, "test.db")

from erp import (accounting, api, auth, db, hr, inventory, partners,  # noqa: E402
                 production, purchasing, sales, seed)
from erp.db import ErpError  # noqa: E402

ADMIN = {"username": "test", "role": "ADMIN", "full_name": "Test"}
TODAY = date.today().isoformat()


def setUpModule():
    db.init_db(force=True)
    seed.build_reference_data()


class GeneralLedgerTests(unittest.TestCase):
    def test_balanced_batch_is_accepted(self):
        batch_id = accounting.create_batch("G", "Test équilibré", TODAY, [
            {"account": "521100", "debit": 100000},
            {"account": "701100", "credit": 100000},
        ], ADMIN)
        batch = accounting.batch_detail(batch_id)
        self.assertEqual(batch["status"], "DRAFT")
        self.assertEqual(batch["total_debit"], batch["total_credit"])
        self.assertEqual(len(batch["lines"]), 2)

    def test_unbalanced_batch_is_rejected(self):
        with self.assertRaises(ErpError) as ctx:
            accounting.create_batch("G", "Déséquilibré", TODAY, [
                {"account": "521100", "debit": 100000},
                {"account": "701100", "credit": 90000},
            ], ADMIN)
        self.assertIn("déséquilibré", str(ctx.exception).lower())

    def test_posting_marks_entries_and_forbids_double_posting(self):
        batch_id = accounting.create_batch("G", "À comptabiliser", TODAY, [
            {"account": "571100", "debit": 5000},
            {"account": "758100", "credit": 5000},
        ], ADMIN)
        accounting.post_batch(batch_id, ADMIN)
        batch = accounting.batch_detail(batch_id)
        self.assertEqual(batch["status"], "POSTED")
        self.assertTrue(all(line["posted"] for line in batch["lines"]))
        with self.assertRaises(ErpError):
            accounting.post_batch(batch_id, ADMIN)

    def test_reversal_produces_mirror_entries(self):
        batch_id = accounting.create_batch("G", "À contrepasser", TODAY, [
            {"account": "571100", "debit": 7000},
            {"account": "758100", "credit": 7000},
        ], ADMIN, auto_post=True)
        reversal_id = accounting.reverse_batch(batch_id, ADMIN, TODAY)
        original = accounting.batch_detail(batch_id)
        reversal = accounting.batch_detail(reversal_id)
        self.assertEqual(original["total_debit"], reversal["total_credit"])
        self.assertEqual(reversal["status"], "POSTED")

    def test_period_with_drafts_cannot_be_closed(self):
        fy, period = db.period_of(TODAY)
        accounting.create_batch("G", "Brouillon bloquant", TODAY, [
            {"account": "571100", "debit": 1000},
            {"account": "758100", "credit": 1000},
        ], ADMIN)
        with self.assertRaises(ErpError) as ctx:
            accounting.set_period_status("SP", fy, period, "CLOSED", ADMIN)
        self.assertIn("non comptabilisé", str(ctx.exception))

    def test_closed_period_refuses_entries(self):
        fy, period = db.period_of(TODAY)
        for batch in accounting.list_batches(status="DRAFT", fy=fy, period=period, limit=500):
            accounting.void_batch(batch["id"], ADMIN)
        accounting.set_period_status("SP", fy, period, "CLOSED", ADMIN)
        try:
            with self.assertRaises(ErpError):
                accounting.create_batch("G", "Période fermée", TODAY, [
                    {"account": "571100", "debit": 1000},
                    {"account": "758100", "credit": 1000},
                ], ADMIN)
        finally:
            accounting.set_period_status("SP", fy, period, "OPEN", ADMIN)

    def test_non_postable_account_is_refused(self):
        db.execute("UPDATE accounts SET postable = 0 WHERE code = '571100'")
        try:
            with self.assertRaises(ErpError):
                accounting.create_batch("G", "Compte de regroupement", TODAY, [
                    {"account": "571100", "debit": 1000},
                    {"account": "758100", "credit": 1000},
                ], ADMIN)
        finally:
            db.execute("UPDATE accounts SET postable = 1 WHERE code = '571100'")


class InventoryTests(unittest.TestCase):
    def setUp(self):
        self.item = inventory.save_item({
            "item_code": "TEST-%d" % db.scalar("SELECT COUNT(*) FROM items", (), 0),
            "description": "Article de test", "item_type": "STOCK",
            "uom": "U", "sale_price": 10000, "standard_cost": 6000}, ADMIN)

    def test_weighted_average_cost(self):
        inventory.record_movement(self.item["id"], "DIAM", "IN", 10, 1000,
                                  user=ADMIN, doc_type="TEST")
        inventory.record_movement(self.item["id"], "DIAM", "IN", 10, 2000,
                                  user=ADMIN, doc_type="TEST")
        item = inventory.get_item(self.item["id"])
        self.assertEqual(item["average_cost"], 1500)
        self.assertEqual(inventory.stock_on_hand(item["id"], "DIAM"), 20)

    def test_issue_uses_average_cost_and_reduces_stock(self):
        inventory.record_movement(self.item["id"], "DIAM", "IN", 4, 2500,
                                  user=ADMIN, doc_type="TEST")
        value = inventory.record_movement(self.item["id"], "DIAM", "OUT", 3,
                                          user=ADMIN, doc_type="TEST")
        self.assertEqual(value, 7500)
        self.assertEqual(inventory.stock_on_hand(self.item["id"], "DIAM"), 1)

    def test_negative_stock_is_refused(self):
        with self.assertRaises(ErpError) as ctx:
            inventory.record_movement(self.item["id"], "DIAM", "OUT", 5, user=ADMIN)
        self.assertIn("insuffisant", str(ctx.exception).lower())

    def test_adjustment_posts_gap_to_accounting(self):
        inventory.record_movement(self.item["id"], "DIAM", "IN", 10, 1000,
                                  user=ADMIN, doc_type="TEST")
        result = inventory.adjust_stock({
            "item_id": self.item["id"], "warehouse": "DIAM", "counted_qty": 8,
            "date": TODAY, "reason": "Test"}, ADMIN)
        self.assertEqual(result["delta"], -2)
        batch = accounting.batch_detail(result["gl_batch_id"])
        self.assertEqual(batch["total_debit"], batch["total_credit"])
        self.assertEqual(inventory.stock_on_hand(self.item["id"], "DIAM"), 8)

    def test_transfer_keeps_global_quantity(self):
        inventory.record_movement(self.item["id"], "DIAM", "IN", 10, 1000,
                                  user=ADMIN, doc_type="TEST")
        inventory.transfer_stock({"item_id": self.item["id"], "quantity": 4,
                                  "from_warehouse": "DIAM", "to_warehouse": "THIES",
                                  "date": TODAY}, ADMIN)
        self.assertEqual(inventory.stock_on_hand(self.item["id"], "DIAM"), 6)
        self.assertEqual(inventory.stock_on_hand(self.item["id"], "THIES"), 4)


class SalesCycleTests(unittest.TestCase):
    def setUp(self):
        self.customer = partners.save_partner({
            "alpha_name": "CLIENT TEST %d" % db.scalar("SELECT COUNT(*) FROM customers", (), 0),
            "is_customer": True, "payment_terms": "30J", "credit_limit": 0}, ADMIN)
        self.item = inventory.save_item({
            "item_code": "SO-TEST-%d" % db.scalar("SELECT COUNT(*) FROM items", (), 0),
            "description": "Article vendu", "item_type": "STOCK",
            "sale_price": 10000, "standard_cost": 6000}, ADMIN)
        inventory.record_movement(self.item["id"], "DIAM", "IN", 100, 6000,
                                  user=ADMIN, doc_type="TEST")

    def _order(self, quantity=10):
        return sales.save_order({
            "customer_an8": self.customer["an8"], "order_date": TODAY, "warehouse": "DIAM",
            "lines": [{"item_id": self.item["id"], "quantity": quantity,
                       "unit_price": 10000, "vat_rate": 18}]}, ADMIN)

    def test_full_cycle_order_to_receipt(self):
        order = self._order()
        self.assertEqual(order["total_ht"], 100000)
        self.assertEqual(order["total_ttc"], 118000)

        sales.confirm_order(order["id"], ADMIN)
        stock_before = inventory.stock_on_hand(self.item["id"], "DIAM")
        shipment = sales.ship_order(order["id"], ADMIN, TODAY)
        self.assertEqual(inventory.stock_on_hand(self.item["id"], "DIAM"), stock_before - 10)
        self.assertEqual(shipment["cogs_amount"], 60000)

        invoice = sales.invoice_order(order["id"], ADMIN, TODAY)
        self.assertEqual(invoice["total_ttc"], 118000)
        self.assertEqual(invoice["status"], "OPEN")
        batch = accounting.batch_detail(invoice["gl_batch_id"])
        self.assertEqual(batch["total_debit"], batch["total_credit"])
        accounts = {line["account_code"]: line for line in batch["lines"]}
        self.assertEqual(accounts["411100"]["debit"], 118000)
        self.assertEqual(accounts["443100"]["credit"], 18000)

        sales.register_receipt({"customer_an8": self.customer["an8"], "amount": 118000,
                                "date": TODAY, "method": "VIREMENT"}, ADMIN)
        settled = sales.get_invoice(invoice["id"])
        self.assertEqual(settled["status"], "PAID")
        self.assertEqual(settled["balance"], 0)

    def test_partial_receipt_leaves_invoice_partial(self):
        order = self._order(5)
        sales.confirm_order(order["id"], ADMIN)
        sales.ship_order(order["id"], ADMIN, TODAY)
        invoice = sales.invoice_order(order["id"], ADMIN, TODAY)
        sales.register_receipt({"customer_an8": self.customer["an8"],
                                "amount": 20000, "date": TODAY}, ADMIN)
        updated = sales.get_invoice(invoice["id"])
        self.assertEqual(updated["status"], "PARTIAL")
        self.assertEqual(updated["balance"], updated["total_ttc"] - 20000)

    def test_credit_limit_blocks_confirmation(self):
        db.update("customers", {"credit_limit": 50000}, "an8 = ?", (self.customer["an8"],))
        order = self._order(10)
        with self.assertRaises(ErpError) as ctx:
            sales.confirm_order(order["id"], ADMIN)
        self.assertIn("encours", str(ctx.exception).lower())
        db.update("customers", {"credit_limit": 0}, "an8 = ?", (self.customer["an8"],))

    def test_cannot_ship_before_confirmation(self):
        order = self._order()
        with self.assertRaises(ErpError):
            sales.ship_order(order["id"], ADMIN, TODAY)

    def test_invoice_requires_shipment(self):
        order = self._order()
        sales.confirm_order(order["id"], ADMIN)
        with self.assertRaises(ErpError):
            sales.invoice_order(order["id"], ADMIN, TODAY)


class PurchaseCycleTests(unittest.TestCase):
    def setUp(self):
        self.supplier = partners.save_partner({
            "alpha_name": "FOURNISSEUR TEST %d" % db.scalar("SELECT COUNT(*) FROM suppliers", (), 0),
            "is_supplier": True, "supplier_payment_terms": "30J"}, ADMIN)
        self.item = inventory.save_item({
            "item_code": "PO-TEST-%d" % db.scalar("SELECT COUNT(*) FROM items", (), 0),
            "description": "Article acheté", "item_type": "STOCK",
            "sale_price": 9000, "standard_cost": 5000}, ADMIN)

    def test_full_cycle_order_to_payment(self):
        order = purchasing.save_order({
            "supplier_an8": self.supplier["an8"], "order_date": TODAY, "warehouse": "DIAM",
            "lines": [{"item_id": self.item["id"], "quantity": 20,
                       "unit_cost": 5000, "vat_rate": 18}]}, ADMIN)
        self.assertEqual(order["total_ttc"], 118000)

        purchasing.approve_order(order["id"], ADMIN)
        receipt = purchasing.receive_order(order["id"], ADMIN, TODAY)
        self.assertEqual(receipt["total_value"], 100000)
        self.assertEqual(inventory.stock_on_hand(self.item["id"], "DIAM"), 20)

        invoice = purchasing.invoice_order(order["id"], ADMIN, TODAY, "REF-TEST")
        batch = accounting.batch_detail(invoice["gl_batch_id"])
        self.assertEqual(batch["total_debit"], batch["total_credit"])
        accounts = {line["account_code"]: line for line in batch["lines"]}
        self.assertEqual(accounts["401100"]["credit"], 118000)
        self.assertEqual(accounts["445100"]["debit"], 18000)
        self.assertEqual(accounts["408100"]["debit"], 100000)

        purchasing.register_payment({"supplier_an8": self.supplier["an8"], "amount": 118000,
                                     "date": TODAY}, ADMIN)
        self.assertEqual(purchasing.get_invoice(invoice["id"])["status"], "PAID")

    def test_receipt_requires_approval(self):
        order = purchasing.save_order({
            "supplier_an8": self.supplier["an8"], "order_date": TODAY, "warehouse": "DIAM",
            "lines": [{"item_id": self.item["id"], "quantity": 5, "unit_cost": 5000}]}, ADMIN)
        with self.assertRaises(ErpError):
            purchasing.receive_order(order["id"], ADMIN, TODAY)

    def test_expense_invoice_posts_to_charge_account(self):
        invoice = purchasing.create_expense_invoice({
            "supplier_an8": self.supplier["an8"], "invoice_date": TODAY,
            "lines": [{"description": "Loyer", "amount_ht": 500000,
                       "vat_rate": 18, "account_code": "612000"}]}, ADMIN)
        batch = accounting.batch_detail(invoice["gl_batch_id"])
        accounts = {line["account_code"]: line for line in batch["lines"]}
        self.assertEqual(accounts["612000"]["debit"], 500000)
        self.assertEqual(batch["total_debit"], batch["total_credit"])


class ProductionTests(unittest.TestCase):
    def setUp(self):
        suffix = db.scalar("SELECT COUNT(*) FROM items", (), 0)
        self.component = inventory.save_item({
            "item_code": "MP-TEST-%d" % suffix, "description": "Matière test",
            "item_type": "MATIERE", "standard_cost": 2000}, ADMIN)
        self.finished = inventory.save_item({
            "item_code": "PF-TEST-%d" % suffix, "description": "Produit fini test",
            "item_type": "FINI", "sale_price": 9000}, ADMIN)
        inventory.record_movement(self.component["id"], "DIAM", "IN", 100, 2000,
                                  user=ADMIN, doc_type="TEST")
        production.save_bom({"item_id": self.finished["id"], "version": "01", "quantity": 10,
                             "lines": [{"component_id": self.component["id"],
                                        "quantity": 2}]}, ADMIN)

    def test_work_order_consumes_components_and_produces_stock(self):
        wo = production.create_work_order({
            "item_id": self.finished["id"], "qty_planned": 20, "warehouse": "DIAM",
            "start_date": TODAY}, ADMIN)
        self.assertEqual(wo["components"][0]["qty_required"], 4)

        production.release_work_order(wo["id"], ADMIN)
        production.issue_components(wo["id"], ADMIN, TODAY)
        self.assertEqual(inventory.stock_on_hand(self.component["id"], "DIAM"), 96)

        completed = production.complete_work_order(wo["id"], ADMIN, 20, TODAY)
        self.assertEqual(completed["status"], "COMPLETED")
        self.assertEqual(inventory.stock_on_hand(self.finished["id"], "DIAM"), 20)
        # l'en-cours est intégralement soldé et le coût unitaire correspond aux matières
        self.assertEqual(completed["wip_value"], 0)
        self.assertEqual(inventory.get_item(self.finished["id"])["average_cost"], 400)

    def test_work_order_requires_bom(self):
        orphan = inventory.save_item({
            "item_code": "PF-NOBOM-%d" % db.scalar("SELECT COUNT(*) FROM items", (), 0),
            "description": "Sans nomenclature", "item_type": "FINI"}, ADMIN)
        with self.assertRaises(ErpError):
            production.create_work_order({"item_id": orphan["id"], "qty_planned": 5,
                                          "warehouse": "DIAM"}, ADMIN)


class PayrollTests(unittest.TestCase):
    def setUp(self):
        self.employee = hr.save_employee({
            "first_name": "Test", "last_name": "SALARIÉ", "position": "Opérateur",
            "contract_type": "CDI", "base_salary": 300000, "transport_allowance": 26000,
            "dependents": 2, "hire_date": TODAY}, ADMIN)

    def test_payslip_arithmetic(self):
        employee = self.employee
        result = hr.compute_payslip(employee)
        self.assertEqual(result["gross"], 326000)
        self.assertAlmostEqual(
            result["net_pay"],
            result["gross"] - result["employee_cont"] - result["income_tax"]
            - result["other_deductions"], delta=1)
        self.assertGreater(result["employer_cont"], 0)
        self.assertEqual(result["total_cost"], result["gross"] + result["employer_cont"])
        # l'indemnité de transport exonérée réduit la base imposable
        self.assertLess(result["taxable"], result["gross"])

    def test_payroll_run_posts_balanced_entries(self):
        run = hr.create_run({"fy": int(TODAY[:4]), "period": 12,
                             "pay_date": TODAY}, ADMIN)
        self.assertGreater(len(run["payslips"]), 0)
        hr.validate_run(run["id"], ADMIN)
        posted = hr.post_run(run["id"], ADMIN, TODAY)
        batch = accounting.batch_detail(posted["gl_batch_id"])
        self.assertEqual(batch["total_debit"], batch["total_credit"])
        self.assertEqual(batch["total_debit"],
                         round(posted["total_gross"] + posted["total_employer_cont"]))
        with self.assertRaises(ErpError):
            hr.create_run({"fy": int(TODAY[:4]), "period": 12, "pay_date": TODAY}, ADMIN)


class SecurityTests(unittest.TestCase):
    def test_password_hash_is_salted_and_verified(self):
        digest, salt = auth.hash_password("secret123")
        self.assertNotEqual(digest, "secret123")
        self.assertTrue(auth.verify_password("secret123", digest, salt))
        self.assertFalse(auth.verify_password("mauvais", digest, salt))

    def test_login_and_session(self):
        auth.create_user("testuser", "motdepasse", "Utilisateur de test", "READONLY")
        session = auth.login("testuser", "motdepasse")
        self.assertIn("token", session)
        user = auth.user_from_token(session["token"])
        self.assertEqual(user["username"], "testuser")
        auth.logout(session["token"])
        self.assertIsNone(auth.user_from_token(session["token"]))
        with self.assertRaises(ErpError):
            auth.login("testuser", "faux")

    def test_permissions_block_write_for_readonly(self):
        user = {"username": "lecteur", "role": "READONLY"}
        self.assertTrue(auth.check(user, "AR", "read"))
        with self.assertRaises(ErpError) as ctx:
            auth.check(user, "AR", "write")
        self.assertEqual(ctx.exception.status, 403)

    def test_api_dispatch_requires_permission(self):
        user = {"username": "lecteur", "role": "READONLY"}
        with self.assertRaises(ErpError):
            api.dispatch("POST", "/api/items", {}, {"item_code": "X", "description": "X"}, user)

    def test_unknown_route_returns_404(self):
        with self.assertRaises(ErpError) as ctx:
            api.dispatch("GET", "/api/inexistant", {}, {}, {"username": "a", "role": "ADMIN"})
        self.assertEqual(ctx.exception.status, 404)


class ReportingTests(unittest.TestCase):
    def test_balance_sheet_balances_and_integrity_is_clean(self):
        fy = int(TODAY[:4])
        balance = accounting.balance_sheet(fy)
        self.assertTrue(balance["balanced"],
                        "actif %s ≠ passif %s" % (balance["total_assets"],
                                                  balance["total_equity_and_liabilities"]))
        trial = accounting.trial_balance(fy)
        self.assertAlmostEqual(sum(row["debit"] for row in trial),
                               sum(row["credit"] for row in trial), delta=1)
        report = accounting.integrity_check(fy)
        self.assertEqual(report["total_anomalies"], 0, report["checks"])

    def test_aged_receivables_totals_match_open_invoices(self):
        aging = sales.aged_receivables()
        expected = db.scalar(
            "SELECT COALESCE(SUM(total_ttc - amount_paid), 0) FROM ar_invoices "
            "WHERE status IN ('OPEN', 'PARTIAL')", (), 0)
        self.assertAlmostEqual(aging["totals"]["total"], round(expected), delta=1)


if __name__ == "__main__":
    unittest.main(verbosity=2)
