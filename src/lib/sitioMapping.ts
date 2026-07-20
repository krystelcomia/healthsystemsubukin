export const SUBUKIN_SITIOS: string[] = [
  "Cama",
  "Centro",
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

  if (lower.includes("alonzo")) return "Matahimik/Punta";
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
