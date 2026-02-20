import type { IntakeIssueType, IntakeFieldDefinition } from '@/types/index';

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
    minExchangesForCTA: 2,
    maxConversationHistory: 2,
    intakeFields: {
      leak: [
        { key: 'location', label: 'Where is the leak?', type: 'select', options: ['Kitchen', 'Bathroom', 'Basement', 'Ceiling', 'Outside', 'Other'], required: true },
        { key: 'severity', label: 'How severe is it?', type: 'select', options: ['Dripping', 'Steady stream', 'Gushing/spraying'], required: true },
        { key: 'near_electrics', label: 'Is it near any electrical outlets or panels?', type: 'boolean', required: true },
        { key: 'details', label: 'Any additional details?', type: 'text', required: false },
      ],
      clog: [
        { key: 'location', label: 'Which drain is affected?', type: 'select', options: ['Kitchen sink', 'Bathroom sink', 'Shower/bath', 'Toilet', 'Outside drain', 'Other'], required: true },
        { key: 'severity', label: 'How bad is the blockage?', type: 'select', options: ['Slow draining', 'Completely blocked', 'Backing up/overflowing'], required: true },
        { key: 'tried_fixes', label: 'Have you tried anything?', type: 'text', required: false },
      ],
      toilet: [
        { key: 'problem', label: 'What is the issue?', type: 'select', options: ['Running constantly', 'Not flushing', 'Leaking at base', 'Blocked', 'Cracked/damaged', 'Other'], required: true },
        { key: 'floor_wet', label: 'Is there water on the floor?', type: 'boolean', required: true },
        { key: 'details', label: 'Any additional details?', type: 'text', required: false },
      ],
      faucet: [
        { key: 'location', label: 'Which faucet?', type: 'select', options: ['Kitchen', 'Bathroom sink', 'Bath', 'Outside tap', 'Other'], required: true },
        { key: 'problem', label: 'What is the issue?', type: 'select', options: ['Dripping when off', 'Low flow', 'No water', 'Hard to turn', 'Leaking underneath', 'Other'], required: true },
        { key: 'details', label: 'Any additional details?', type: 'text', required: false },
      ],
      low_pressure: [
        { key: 'affected_areas', label: 'Where is pressure low?', type: 'select', options: ['Whole house', 'One room only', 'Hot water only', 'Cold water only'], required: true },
        { key: 'sudden', label: 'Did this start suddenly?', type: 'boolean', required: true },
        { key: 'details', label: 'Any additional details?', type: 'text', required: false },
      ],
      no_hot_water: [
        { key: 'boiler_type', label: 'What type of boiler/heater?', type: 'select', options: ['Combi boiler', 'System boiler', 'Immersion heater', 'Not sure'], required: true },
        { key: 'error_codes', label: 'Any error codes or lights on the boiler?', type: 'text', required: false },
        { key: 'heating_works', label: 'Does the heating still work?', type: 'boolean', required: true },
      ],
      smell: [
        { key: 'smell_type', label: 'What does it smell like?', type: 'select', options: ['Rotten eggs/gas', 'Sewage', 'Musty/damp', 'Chemical', 'Other'], required: true },
        { key: 'location', label: 'Where is the smell strongest?', type: 'select', options: ['Kitchen', 'Bathroom', 'Basement', 'Outside', 'Whole house'], required: true },
        { key: 'gas_suspected', label: 'Do you suspect a gas leak?', type: 'boolean', required: true },
      ],
      other: [
        { key: 'description', label: 'Describe the issue', type: 'text', required: true },
        { key: 'location', label: 'Where in the property?', type: 'select', options: ['Kitchen', 'Bathroom', 'Basement', 'Outside', 'Other'], required: false },
      ],
    } as Record<IntakeIssueType, IntakeFieldDefinition[]>,
    triageSystemPrompt: `You are Plumberly's triage AI. Analyze the plumbing issue and respond with JSON only.

Given the intake data and conversation, determine:
1. emergency_flag: true if gas leak, gushing water, sewage backup, water near electrics, structural damage
2. category: 1 (simple DIY), 2 (temporary mitigation + professional), 3 (professional required)
3. confidence: 0.0-1.0 how confident you are in the classification
4. follow_up_questions: array of 0-2 clarifying questions if needed
5. response: helpful response text for the user

Respond with valid JSON: {"emergency_flag":bool,"category":int,"confidence":float,"follow_up_questions":[],"response":""}`,
    // NOTE: The authoritative prompt lives in supabase/functions/chat-triage/index.ts (FULL_SYSTEM_PROMPT).
    // This client-side copy is kept for reference only and is NOT used at runtime.
    fullSystemPrompt: `[See supabase/functions/chat-triage/index.ts for the active prompt]`,
  },
} as const;
