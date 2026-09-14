import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cacheRead, getCachedRead } from "@/lib/offline";

const SiteCtx = createContext(null);

export function SiteProvider({ children }) {
  const [sites, setSites] = useState([]);
  const [siteId, setSiteId] = useState(localStorage.getItem("asys_site_id") || "");

  const refresh = async () => {
    try {
      const { data } = await api.get("/sites");
      setSites(data);
      cacheRead("sites", data);
      if (!siteId && data.length > 0) {
        setSiteId(data[0].id);
        localStorage.setItem("asys_site_id", data[0].id);
      }
    } catch {
      const cached = getCachedRead("sites") || [];
      setSites(cached);
    }
  };

  useEffect(() => { refresh(); }, []);

  const changeSite = (id) => {
    setSiteId(id);
    localStorage.setItem("asys_site_id", id);
  };

  return (
    <SiteCtx.Provider value={{ sites, siteId, changeSite, refreshSites: refresh }}>
      {children}
    </SiteCtx.Provider>
  );
}

export const useSite = () => useContext(SiteCtx);
