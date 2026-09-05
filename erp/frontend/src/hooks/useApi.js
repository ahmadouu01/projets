import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";

// Charge des données depuis l'API avec état loading/error, et expose `reload()`
// pour rafraîchir après une création/modification.
export function useFetch(path, { deps = [], enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(() => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    api
      .get(path)
      .then(setData)
      .catch((err) => setError(err.message || "Erreur de chargement."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, enabled, ...deps]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload, setData };
}
