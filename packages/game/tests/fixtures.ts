import type { Character, ThemeAttribute } from "@chutai/shared";

export const attributes: ThemeAttribute[] = [
  { key: "region", label: "Região", type: "text" },
  { key: "biomes", label: "Biomas", type: "list" },
  { key: "year", label: "Ano", type: "number" },
  {
    key: "weight",
    label: "Peso",
    type: "range",
    unit: "kg",
    tolerance: 25,
    toleranceIsPercent: true,
  },
];

export const onca: Character = {
  id: "onca",
  name: "Onça-pintada",
  aliases: ["Jaguar"],
  values: { region: "Norte", biomes: ["Amazônia", "Pantanal", "Cerrado"], year: 1758, weight: 90 },
};

export const capivara: Character = {
  id: "capivara",
  name: "Capivara",
  values: { region: "Sudeste", biomes: ["Pantanal", "Mata Atlântica"], year: 1766, weight: 50 },
};

export const lobo: Character = {
  id: "lobo",
  name: "Lobo-guará",
  values: { region: "Centro-Oeste", biomes: ["Cerrado"], year: 1815, weight: 23 },
};

export const anta: Character = {
  id: "anta",
  name: "Anta",
  values: { region: "norte", biomes: ["Amazônia", "Pantanal", "Cerrado"], year: 1758, weight: 75 },
};
