const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { computePayroll } = require("../src/utils/payroll");

const prisma = new PrismaClient();

async function main() {
  console.log("Nettoyage de la base...");
  await prisma.payment.deleteMany();
  await prisma.invoiceLine.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.roundStop.deleteMany();
  await prisma.round.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.washCycle.deleteMany();
  await prisma.stockItem.deleteMany();
  await prisma.contractLine.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.articleType.deleteMany();
  await prisma.site.deleteMany();
  await prisma.client.deleteMany();
  await prisma.payroll.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.user.deleteMany();

  console.log("Création des utilisateurs...");
  const passwordHash = await bcrypt.hash("Senegal2026!", 10);
  await prisma.user.createMany({
    data: [
      { name: "Fatou Ndiaye", email: "admin@erp-senegal.sn", passwordHash, role: "ADMIN" },
      { name: "Moussa Diop", email: "commercial@erp-senegal.sn", passwordHash, role: "COMMERCIAL" },
      { name: "Ibrahima Fall", email: "logistique@erp-senegal.sn", passwordHash, role: "LOGISTIQUE" },
      { name: "Aïssatou Ba", email: "production@erp-senegal.sn", passwordHash, role: "PRODUCTION" },
      { name: "Cheikh Sarr", email: "compta@erp-senegal.sn", passwordHash, role: "COMPTABILITE" },
      { name: "Mariama Sy", email: "rh@erp-senegal.sn", passwordHash, role: "RH" },
    ],
  });

  console.log("Création des types d'articles...");
  const articleTypesData = [
    { name: "Blouse blanche cuisine (M)", category: "VETEMENT_TRAVAIL", replacementCost: 12000, rentalPrice: 1500 },
    { name: "Combinaison industrielle (L)", category: "VETEMENT_TRAVAIL", replacementCost: 22000, rentalPrice: 2800 },
    { name: "Tenue médicale (blouse + pantalon)", category: "VETEMENT_TRAVAIL", replacementCost: 15000, rentalPrice: 1900 },
    { name: "Gilet haute visibilité", category: "VETEMENT_TRAVAIL", replacementCost: 9000, rentalPrice: 1200 },
    { name: "Drap plat 220x240", category: "LINGE_PLAT", replacementCost: 8000, rentalPrice: 900 },
    { name: "Nappe restaurant 150x150", category: "LINGE_PLAT", replacementCost: 7500, rentalPrice: 850 },
    { name: "Essuie-mains rouleau", category: "LINGE_PLAT", replacementCost: 4000, rentalPrice: 500 },
    { name: "Tapis logo d'entrée 85x150", category: "TAPIS", replacementCost: 45000, rentalPrice: 5500 },
    { name: "Tapis anti-fatigue cuisine", category: "TAPIS", replacementCost: 38000, rentalPrice: 4800 },
    { name: "Distributeur savon + recharge", category: "HYGIENE", replacementCost: 18000, rentalPrice: 2200 },
    { name: "Essuie-mains à dévidage (kit)", category: "HYGIENE", replacementCost: 16000, rentalPrice: 2000 },
  ];
  const articleTypes = [];
  for (const data of articleTypesData) {
    articleTypes.push(await prisma.articleType.create({ data }));
  }
  const findArticle = (name) => articleTypes.find((a) => a.name === name);

  console.log("Création des clients & sites...");
  const clientsData = [
    { name: "Hôtel Teranga Dakar", sector: "Hôtellerie", city: "Dakar", region: "Dakar", ninea: "SN-0012345", rccm: "SN.DKR.2015.B.1123", phone: "+221 33 823 45 12", email: "contact@terangahotel.sn", address: "Corniche Ouest, Dakar", contactName: "Awa Cissé" },
    { name: "Clinique La Madeleine", sector: "Santé", city: "Dakar", region: "Dakar", ninea: "SN-0023456", rccm: "SN.DKR.2012.B.0456", phone: "+221 33 821 90 33", email: "administration@clinique-madeleine.sn", address: "Rue Béranger Ferraud, Dakar", contactName: "Dr. Sarr" },
    { name: "Agro Industries du Sénégal (AIS)", sector: "Agroalimentaire", city: "Rufisque", region: "Dakar", ninea: "SN-0034567", rccm: "SN.RFQ.2010.B.0789", phone: "+221 33 836 22 10", email: "achats@ais.sn", address: "Zone Industrielle, Rufisque", contactName: "Modou Kane" },
    { name: "Restaurant Le Baobab", sector: "Restauration", city: "Dakar", region: "Dakar", ninea: "SN-0045678", phone: "+221 77 456 12 34", email: "resa@lebaobab.sn", address: "Almadies, Dakar", contactName: "Khady Diallo" },
    { name: "Usine Textile de Thiès (UTT)", sector: "Industrie textile", city: "Thiès", region: "Thiès", ninea: "SN-0056789", rccm: "SN.THS.2011.B.0234", phone: "+221 33 951 44 21", email: "contact@utt.sn", address: "Route de Dakar, Thiès", contactName: "Ousmane Gueye" },
    { name: "Hôpital Régional de Saint-Louis", sector: "Santé", city: "Saint-Louis", region: "Saint-Louis", ninea: "SN-0067890", phone: "+221 33 961 12 34", email: "logistique@hrsl.sn", address: "Route de Sor, Saint-Louis", contactName: "Fatoumata Wane" },
  ];

  const clients = [];
  for (const data of clientsData) {
    const client = await prisma.client.create({ data });
    clients.push(client);
    await prisma.site.create({
      data: {
        clientId: client.id,
        name: `Site principal — ${client.name}`,
        address: client.address,
        city: client.city,
        region: client.region,
        contactName: client.contactName,
        contactPhone: client.phone,
      },
    });
  }
  const sites = await prisma.site.findMany();

  console.log("Création des contrats...");
  const contractsDef = [
    { client: clients[0], lines: [["Drap plat 220x240", 300, 900], ["Essuie-mains rouleau", 40, 500], ["Tapis logo d'entrée 85x150", 4, 5500]] },
    { client: clients[1], lines: [["Tenue médicale (blouse + pantalon)", 120, 1900], ["Drap plat 220x240", 200, 900]] },
    { client: clients[2], lines: [["Combinaison industrielle (L)", 80, 2800], ["Gilet haute visibilité", 80, 1200]] },
    { client: clients[3], lines: [["Nappe restaurant 150x150", 60, 850], ["Tapis anti-fatigue cuisine", 6, 4800]] },
    { client: clients[4], lines: [["Combinaison industrielle (L)", 150, 2800], ["Distributeur savon + recharge", 20, 2200]] },
    { client: clients[5], lines: [["Tenue médicale (blouse + pantalon)", 90, 1900], ["Essuie-mains à dévidage (kit)", 15, 2000]] },
  ];

  let contractSeq = 1;
  const contracts = [];
  for (const def of contractsDef) {
    const site = sites.find((s) => s.clientId === def.client.id);
    const contract = await prisma.contract.create({
      data: {
        reference: `CTR-2026-${String(contractSeq++).padStart(6, "0")}`,
        clientId: def.client.id,
        siteId: site.id,
        startDate: new Date("2026-01-01"),
        billingFrequency: "MENSUEL",
        status: "ACTIF",
        lines: {
          create: def.lines.map(([name, quantity, unitPrice]) => ({
            articleTypeId: findArticle(name).id,
            quantity,
            unitPrice,
          })),
        },
      },
      include: { lines: true },
    });
    contracts.push(contract);
  }

  console.log("Création du parc d'articles traçables (stock)...");
  let codeSeq = 1;
  for (const contract of contracts) {
    for (const line of contract.lines) {
      const toCreate = Math.min(line.quantity, 25); // échantillon représentatif
      for (let i = 0; i < toCreate; i++) {
        const statuses = ["EN_SERVICE", "EN_SERVICE", "EN_STOCK", "EN_LAVAGE"];
        await prisma.stockItem.create({
          data: {
            code: `ART-${String(codeSeq++).padStart(6, "0")}`,
            articleTypeId: line.articleTypeId,
            clientId: contract.clientId,
            status: statuses[i % statuses.length],
            washCount: Math.floor(Math.random() * 40),
            lastWashDate: new Date(Date.now() - Math.random() * 30 * 86400000),
          },
        });
      }
    }
  }

  console.log("Création des factures & paiements...");
  let invoiceSeq = 1;
  for (const contract of contracts) {
    const totalHT = contract.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
    const totalTVA = totalHT * 0.18;
    const totalTTC = totalHT + totalTVA;

    const invoice = await prisma.invoice.create({
      data: {
        number: `FAC-2026-${String(invoiceSeq++).padStart(6, "0")}`,
        clientId: contract.clientId,
        contractId: contract.id,
        issueDate: new Date("2026-08-01"),
        dueDate: new Date("2026-08-31"),
        status: "ENVOYEE",
        totalHT,
        totalTVA,
        totalTTC,
        lines: {
          create: contract.lines.map((l) => ({
            description: "Location-entretien mensuelle",
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            amountHT: l.quantity * l.unitPrice,
          })),
        },
      },
    });

    // La moitié des factures sont réglées, pour un tableau de bord réaliste
    if (invoiceSeq % 2 === 0) {
      await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: totalTTC,
          method: "MOBILE_MONEY",
          reference: `OM-${invoice.number}`,
        },
      });
      await prisma.invoice.update({ where: { id: invoice.id }, data: { status: "PAYEE" } });
    }
  }
  // Marque une facture en retard pour illustrer le KPI de relance
  const enRetard = await prisma.invoice.findFirst({ where: { status: "ENVOYEE" } });
  if (enRetard) {
    await prisma.invoice.update({
      where: { id: enRetard.id },
      data: { status: "EN_RETARD", dueDate: new Date("2026-07-15") },
    });
  }

  console.log("Création des véhicules, chauffeurs & tournées...");
  const vehicles = await Promise.all(
    [
      { plate: "DK-2024-AA", model: "Renault Master", capacity: 800 },
      { plate: "DK-3051-AB", model: "Iveco Daily", capacity: 1200 },
      { plate: "TH-1180-AC", model: "Peugeot Boxer", capacity: 900 },
    ].map((v) => prisma.vehicle.create({ data: v }))
  );

  const drivers = await Promise.all(
    [
      { name: "Abdoulaye Niang", phone: "+221 77 111 22 33", licenseNumber: "SN-PL-00123" },
      { name: "Seydina Diagne", phone: "+221 76 222 33 44", licenseNumber: "SN-PL-00456" },
      { name: "Ndeye Fatou Sow", phone: "+221 78 333 44 55", licenseNumber: "SN-PL-00789" },
    ].map((d) => prisma.driver.create({ data: d }))
  );

  const today = new Date();
  today.setHours(8, 0, 0, 0);

  await prisma.round.create({
    data: {
      name: "Tournée Dakar Nord",
      date: today,
      zone: "Dakar",
      vehicleId: vehicles[0].id,
      driverId: drivers[0].id,
      status: "PLANIFIEE",
      stops: {
        create: [
          { clientId: clients[0].id, siteId: sites.find((s) => s.clientId === clients[0].id).id, sequence: 1, plannedTime: today },
          { clientId: clients[1].id, siteId: sites.find((s) => s.clientId === clients[1].id).id, sequence: 2, plannedTime: today },
          { clientId: clients[3].id, siteId: sites.find((s) => s.clientId === clients[3].id).id, sequence: 3, plannedTime: today },
        ],
      },
    },
  });

  await prisma.round.create({
    data: {
      name: "Tournée Thiès - Rufisque",
      date: today,
      zone: "Thiès",
      vehicleId: vehicles[1].id,
      driverId: drivers[1].id,
      status: "PLANIFIEE",
      stops: {
        create: [
          { clientId: clients[2].id, siteId: sites.find((s) => s.clientId === clients[2].id).id, sequence: 1, plannedTime: today },
          { clientId: clients[4].id, siteId: sites.find((s) => s.clientId === clients[4].id).id, sequence: 2, plannedTime: today },
        ],
      },
    },
  });

  console.log("Création des employés & de la paie...");
  const employeesData = [
    { firstName: "Fatou", lastName: "Ndiaye", position: "Directrice Générale", department: "DIRECTION", hireDate: new Date("2019-03-01"), baseSalary: 1500000, phone: "+221 77 000 00 01" },
    { firstName: "Moussa", lastName: "Diop", position: "Responsable Commercial", department: "COMMERCIAL", hireDate: new Date("2020-06-15"), baseSalary: 650000, phone: "+221 77 000 00 02" },
    { firstName: "Ibrahima", lastName: "Fall", position: "Responsable Logistique", department: "LOGISTIQUE", hireDate: new Date("2021-01-10"), baseSalary: 550000, phone: "+221 77 000 00 03" },
    { firstName: "Aïssatou", lastName: "Ba", position: "Chef d'Atelier Blanchisserie", department: "PRODUCTION", hireDate: new Date("2018-09-01"), baseSalary: 500000, phone: "+221 77 000 00 04" },
    { firstName: "Abdoulaye", lastName: "Niang", position: "Chauffeur-Livreur", department: "LOGISTIQUE", hireDate: new Date("2022-02-01"), baseSalary: 200000, phone: "+221 77 111 22 33" },
    { firstName: "Seydina", lastName: "Diagne", position: "Chauffeur-Livreur", department: "LOGISTIQUE", hireDate: new Date("2022-05-01"), baseSalary: 200000, phone: "+221 76 222 33 44" },
    { firstName: "Cheikh", lastName: "Sarr", position: "Comptable", department: "ADMINISTRATION", hireDate: new Date("2020-11-01"), baseSalary: 450000, phone: "+221 77 000 00 05" },
    { firstName: "Mariama", lastName: "Sy", position: "Responsable RH", department: "RH", hireDate: new Date("2021-04-01"), baseSalary: 480000, phone: "+221 77 000 00 06" },
  ];

  const employees = [];
  for (const data of employeesData) {
    employees.push(await prisma.employee.create({ data }));
  }

  for (const emp of employees) {
    const calc = computePayroll({ baseSalary: emp.baseSalary, allowances: 25000 });
    await prisma.payroll.create({
      data: { employeeId: emp.id, period: "2026-08", ...calc },
    });
  }

  console.log("Seed terminé avec succès.");
  console.log("\nComptes de démonstration (mot de passe : Senegal2026!) :");
  console.log(" - admin@erp-senegal.sn (Administrateur)");
  console.log(" - commercial@erp-senegal.sn (Commercial)");
  console.log(" - logistique@erp-senegal.sn (Logistique)");
  console.log(" - production@erp-senegal.sn (Production)");
  console.log(" - compta@erp-senegal.sn (Comptabilité)");
  console.log(" - rh@erp-senegal.sn (RH)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
