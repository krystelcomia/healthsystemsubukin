import { supabase } from "@/integrations/supabase/client";

export const SUBUKIN_SITIOS: string[] = [
  "Cama",
  "Makalintal 1",
  "Makalintal 2",
  "Maligaya",
  "Manggahan 1",
  "Manggahan 2",
  "Masaya",
  "Masigla",
  "Matahimik / Burol",
  "Matahimik / Punta",
  "Puntor"
];

export const BHW_SITIO_MAPPING: Record<string, string> = {
  "merlita r. alonzo": "Matahimik / Punta",
  "renalyn d. laurente": "Matahimik / Burol",
  "cecilia g. benosa": "Maligaya",
  "cristeta r. lanuza": "Masigla",
  "evelyn t. ilao": "Manggahan 1",
  "evelyn t. ilad": "Manggahan 1",
  "nenita m. dimaculangan": "Manggahan 2",
  "mercy o. abanilla": "Cama",
  "amelita r. sayat": "Puntor",
  "wilma d. tanyag": "Masaya",
  "suzette b. lopez": "Makalintal 1",
  "renchie v. ilao": "Makalintal 2",
  "renche v. ilao": "Makalintal 2",
};

export const getAssignedSitio = (name: string): string => {
  if (!name) return "";
  const lower = name.toLowerCase().trim();

  if (lower.includes("alonzo")) return "Matahimik / Punta";
  if (lower.includes("laurente")) return "Matahimik / Burol";
  if (lower.includes("benosa")) return "Maligaya";
  if (lower.includes("lanuza")) return "Masigla";
  if (lower.includes("ilao") || lower.includes("ilad")) {
    if (lower.includes("evelyn")) return "Manggahan 1";
    if (lower.includes("rench")) return "Makalintal 2";
  }
  if (lower.includes("dimaculangan")) return "Manggahan 2";
  if (lower.includes("abanilla")) return "Cama";
  if (lower.includes("sayat")) return "Puntor";
  if (lower.includes("tanyag")) return "Masaya";
  if (lower.includes("lopez")) return "Makalintal 1";

  return BHW_SITIO_MAPPING[lower] || "";
};

export const getDatabaseSitios = async (): Promise<string[]> => {
  try {
    const [resData, workerData, famData] = await Promise.all([
      supabase.from("residents").select("sitio"),
      supabase.from("bhw_workers").select("assigned_sitio, address"),
      supabase.from("family_data").select("sitio"),
    ]);

    const resSitios = (resData.data || []).map((r: any) => r.sitio).filter(Boolean);
    const workerSitios = (workerData.data || []).flatMap((w: any) => [w.assigned_sitio, w.address]).filter(Boolean);
    const famSitios = (famData.data || []).map((f: any) => f.sitio).filter(Boolean);

    const foundSitios = Array.from(new Set([...resSitios, ...workerSitios, ...famSitios]))
      .map((s: string) => s.trim())
      .filter((s: string) => Boolean(s) && s !== "Centro" && s !== "Sitio Centro")
      .sort();

    return foundSitios.length > 0 ? foundSitios : SUBUKIN_SITIOS;
  } catch (e) {
    console.error("Error loading sitios from database:", e);
    return SUBUKIN_SITIOS;
  }
};
