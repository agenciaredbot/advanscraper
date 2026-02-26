interface LeadForExport {
  businessName: string | null;
  contactPerson: string | null;
  firstName: string | null;
  lastName: string | null;
  contactTitle: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  category: string | null;
  rating: number | null;
  reviewsCount: number | null;
  source: string;
  state: string | null;
  industry: string | null;
  linkedinUrl: string | null;
  googleMapsUrl: string | null;
  profileUrl: string | null;
  scrapedAt: Date | string;
}

const CSV_HEADERS = [
  "Negocio",
  "Nombre",
  "Apellido",
  "Título",
  "Email",
  "Teléfono",
  "Website",
  "Dirección",
  "Ciudad",
  "Estado",
  "País",
  "Categoría",
  "Industria",
  "Rating",
  "Reviews",
  "Fuente",
  "Perfil URL",
  "LinkedIn URL",
  "Google Maps URL",
  "Fecha Scraping",
];

function escapeCSV(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateCSV(leads: LeadForExport[]): string {
  const rows = [CSV_HEADERS.join(",")];

  for (const lead of leads) {
    const row = [
      escapeCSV(lead.businessName),
      escapeCSV(lead.firstName),
      escapeCSV(lead.lastName),
      escapeCSV(lead.contactTitle),
      escapeCSV(lead.email),
      escapeCSV(lead.phone),
      escapeCSV(lead.website),
      escapeCSV(lead.address),
      escapeCSV(lead.city),
      escapeCSV(lead.state),
      escapeCSV(lead.country),
      escapeCSV(lead.category),
      escapeCSV(lead.industry),
      lead.rating?.toString() || "",
      lead.reviewsCount?.toString() || "",
      escapeCSV(lead.source),
      escapeCSV(lead.profileUrl),
      escapeCSV(lead.linkedinUrl),
      escapeCSV(lead.googleMapsUrl),
      lead.scrapedAt
        ? new Date(lead.scrapedAt).toISOString().split("T")[0]
        : "",
    ];
    rows.push(row.join(","));
  }

  return rows.join("\n");
}
