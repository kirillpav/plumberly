export const Config = {
  currency: {
    symbol: "\u00A3",
    code: "GBP",
  },
  supabase: {
    url: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
  },
  openai: {
    apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? "",
    model: "gpt-4o",
  },
  googleMaps: {
    apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
  },
  defaultMapRegion: {
    latitude: 51.5074,
    longitude: -0.1278,
    latitudeDelta: 0.15,
    longitudeDelta: 0.15,
  },
  chatbot: {
    minExchangesForCTA: 3,
    systemPrompt:
      "You are a helpful plumbing assistant for Plumberly. Help homeowners diagnose plumbing issues by asking relevant questions about their problem. You can view images: when the user attaches photos, use them to help diagnose the issue (e.g. leaks, blockages, fixture damage). Be friendly, professional, and concise. After gathering enough information, suggest they book a plumber through the app.",
  },
} as const;
