export type Monitor = {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
};

export async function getMonitors(): Promise<Monitor[]> {
  const apiUrl = process.env.WATCHTOWER_API_URL ?? "http://localhost:3001";
  const response = await fetch(new URL("/monitors", apiUrl), {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`A API de monitores respondeu com HTTP ${response.status}.`);
  }

  return response.json();
}