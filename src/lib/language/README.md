# 🌍 Language System Module

This directory contains the complete multilingual infrastructure for CodeSarthi.

## 📁 Module Structure

```
src/lib/language/
├── index.ts                   # Main exports
├── languageManager.ts         # Language config, fonts, preferences
├── promptBuilder.ts           # LLM prompt templates
├── flowvizCache.ts           # Caching system
├── descriptionGenerator.ts    # File descriptions
├── edgeAnalyzer.ts           # Edge labels
├── beginnerPathGenerator.ts   # Learning paths
├── impactAnalyzer.ts          # Impact analysis
└── quizGenerator.ts          # Quiz generation
```

## 🚀 Quick Start

### Import Everything

```typescript
import {
  LanguageCode,
  generateFileDescription,
  generateEdgeLabel,
  generateBeginnerPath,
  generateImpactAnalysis,
  generateQuizQuestion,
  flowvizCache,
} from "@/lib/language";
```

### Or Import Selectively

```typescript
import { LanguageCode, getLanguageConfig } from "@/lib/language/languageManager";
import { generateFileDescription } from "@/lib/language/descriptionGenerator";
```

## 🔧 Core Functions

### Language Manager

```typescript
// Get language config
const config = getLanguageConfig("HI");
console.log(config.nativeName); // "हिंदी"

// Load font dynamically
loadLanguageFont("TA");

// User preference
saveUserPreferredLanguage("MR");
const preferred = getUserPreferredLanguage(); // "MR"
```

### Description Generator

```typescript
const description = await generateFileDescription(
  "project-123",
  "Button.tsx",
  fileContent,
  "HI"
);
// Returns:
// {
//   main_responsibility: "Button component बनाता है",
//   what_it_does: "यह एक reusable button component है...",
//   real_world_analogy: "जैसे TV remote का button...",
//   key_functions: [...],
//   file_type: "component",
//   complexity_level: "beginner",
//   time_to_understand: "5 mins"
// }
```

### Edge Analyzer

```typescript
const label = await generateEdgeLabel(
  projectId,
  {
    fromFile: "Button.tsx",
    toFile: "page.tsx",
    detectedConnections: {
      imports: ["./Button"],
      functionCalls: ["Button"],
    },
  },
  "TA"
);
// Returns:
// {
//   short_label: "render செய்கிறது",
//   full_explanation: "Button component page-இல் render ஆகிறது",
//   connection_type: "renders"
// }
```

### Beginner Path Generator

```typescript
const path = await generateBeginnerPath(
  projectId,
  [
    { filename: "main.ts", oneLineSummary: "Entry point", type: "entry", complexity: "beginner" },
    // ... more files
  ],
  "TE"
);
// Returns:
// {
//   beginner_path: [
//     { order: 1, filename: "main.ts", why_start_here: "...", ... }
//   ],
//   files_to_skip: ["config.test.ts"],
//   skip_reason: "...",
//   learning_path_summary: "..."
// }
```

### Impact Analyzer

```typescript
const impact = await generateImpactAnalysis(
  projectId,
  {
    filename: "auth.ts",
    fileDescription: "Authentication logic",
    directDependents: ["login.ts", "profile.ts"],
    indirectDependents: ["dashboard.ts"],
    totalAffected: 3,
  },
  "KN"
);
// Returns:
// {
//   impact_summary: "...",
//   severity: "HIGH",
//   what_stops_working: ["Login breaks", "Profile access fails"],
//   severity_reason: "...",
//   analogy: "..."
// }
```

### Quiz Generator

```typescript
const quiz = await generateQuizQuestion(
  projectId,
  "utils.ts",
  fileContent,
  "Utility functions",
  "BN"
);
// Returns:
// {
//   question: "এই ফাইলের প্রধান উদ্দেশ্য কী?",
//   options: { A: "...", B: "...", C: "...", D: "..." },
//   correct: "B",
//   explanation_if_correct: "...",
//   explanation_if_wrong: "...",
//   hint: "...",
//   xp_reward: 10,
//   difficulty: "easy"
// }

// Check answer
const result = checkAnswer(quiz, "B");
// { correct: true, explanation: "...", xpAwarded: 10 }
```

## 💾 Caching

### Automatic Caching

All generation functions support automatic caching:

```typescript
// First call: generates and caches
const desc1 = await generateFileDescription(projectId, filename, content, "HI");

// Second call: instant (from cache)
const desc2 = await generateFileDescription(projectId, filename, content, "HI");
```

### Cache Management

```typescript
// Get cache stats
const stats = flowvizCache.getStats("project-123");
console.log(stats.totalEntries, stats.totalSize);

// Check cached languages
const cached = flowvizCache.getCachedLanguages(projectId, filename, content, "description");
console.log(cached); // ["EN", "HI", "TA"]

// Invalidate file cache (when file changes)
flowvizCache.invalidateFile(projectId, filename);

// Clear project cache
flowvizCache.invalidateProject(projectId);

// Clear all
flowvizCache.clear();
```

### Pre-warming

```typescript
import { prewarmFileDescriptions } from "@/lib/language/descriptionGenerator";

// Generate in background for multiple languages
await prewarmFileDescriptions(
  projectId,
  filename,
  content,
  ["HI", "TA", "TE", "MR"]
);
```

## 📝 Prompt System

### Build Custom Prompts

```typescript
import { buildPrompt } from "@/lib/language/promptBuilder";

const prompt = buildPrompt({
  featureType: "description",
  languageCode: "GU",
  filename: "app.ts",
  fileContent: "...",
  extraContext: { framework: "Next.js" },
});
```

### Validate LLM Response

```typescript
import { validateLLMResponse } from "@/lib/language/promptBuilder";

const response = await callLLM(prompt);
const validation = validateLLMResponse(response, "description");

if (!validation.valid) {
  console.error("Missing fields:", validation.missing);
}
```

## 🎨 Font Loading

Fonts are loaded automatically when a language is selected:

```typescript
loadLanguageFont("TA"); // Loads Noto Sans Tamil
loadLanguageFont("KN"); // Loads Noto Sans Kannada
```

Supported scripts:
- **Latin**: Inter (default)
- **Devanagari** (HI, MR): Noto Sans Devanagari
- **Tamil** (TA): Noto Sans Tamil
- **Telugu** (TE): Noto Sans Telugu
- **Kannada** (KN): Noto Sans Kannada
- **Bengali** (BN): Noto Sans Bengali
- **Gujarati** (GU): Noto Sans Gujarati

## ⚡ Performance

### Generation Times

- **First generation**: 2-3 seconds (LLM call)
- **Cached response**: <100ms
- **Pre-warmed language**: <100ms

### Cache Hit Rate

After warm-up: ~85%

### Optimization Tips

1. **Pre-warm common languages** after loading English
2. **Use batch generation** for multiple files
3. **Show loading skeletons** during generation
4. **Set reasonable timeouts** (3-5 seconds)

## 🔐 API Keys

Required environment variables:

```env
GOOGLE_API_KEY=your_gemini_key    # Primary (Gemini 2.0 Flash)
OPENAI_API_KEY=your_openai_key    # Fallback (GPT-4o-mini)
```

## 🧪 Testing

### Test Description Generation

```bash
curl -X POST http://localhost:3000/api/language \
  -H "Content-Type: application/json" \
  -d '{
    "action": "generate_description",
    "projectId": "test",
    "filename": "test.ts",
    "fileContent": "export const test = 123;",
    "languageCode": "HI"
  }'
```

### Test Cache

```bash
curl http://localhost:3000/api/language?action=stats&projectId=test
```

## 📚 Examples

See:
- `INTEGRATION_EXAMPLE.tsx` - Full component integration
- `LANGUAGE_SYSTEM.md` - Complete documentation
- React hook: `src/hooks/useLanguageAPI.ts`

## 🛠️ Extension

### Add New Feature Type

1. Add to `FeatureType` in `promptBuilder.ts`
2. Create prompt in `buildPrompt()`
3. Add schema to `getExpectedSchema()`
4. Create generator file (e.g., `newFeatureGenerator.ts`)
5. Export from `index.ts`
6. Add API handler in `api/language/route.ts`

### Add New Language

1. Add to `LanguageCode` type
2. Add config to `LANGUAGE_CONFIG`
3. Add font URL if needed
4. Update documentation

## 🐛 Common Issues

### Issue: JSON parsing fails

**Solution**: Responses are parsed with regex fallback. Check console for raw output.

### Issue: Font not loading

**Solution**: Verify Google Fonts URL in `languageManager.ts`

### Issue: Cache not working

**Solution**: Cache is in-memory. Use Redis for production persistence.

## 📄 License

Part of CodeSarthi - AI for Bharat Hackathon 2025
