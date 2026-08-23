import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export function loadSkill(skillFileName: string): string {
  const normalizedName = skillFileName.endsWith('.md') ? skillFileName : `${skillFileName}.md`;
  
  // Possible locations depending on runtime cwd and dist/src layout
  const possiblePaths = [
    path.join(process.cwd(), 'src', 'skills', normalizedName),
    path.join(process.cwd(), 'skills', normalizedName),
    path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'skills', normalizedName),
    path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'skills', normalizedName),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        return fs.readFileSync(p, 'utf-8');
      } catch (err) {
        console.warn(`[SkillLoader] Failed to read skill file at ${p}:`, err);
      }
    }
  }

  console.warn(`[SkillLoader] Skill file not found: ${normalizedName}`);
  return '';
}

/**
 * Load a skill file and interpolate `{{variable}}` and `{{#if var}}...{{/if}}` blocks.
 * Variables not found in the map are replaced with an empty string.
 */
export function renderSkill(skillFileName: string, variables: Record<string, any> = {}): string {
  let template = loadSkill(skillFileName);
  if (!template) return '';

  // 1. Process conditional blocks: {{#if varName}}...{{/if}}
  template = template.replace(/\{\{#if\s+([a-zA-Z0-9_]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, varName, inner) => {
    const val = variables[varName];
    return (val && (!Array.isArray(val) || val.length > 0) && val !== '') ? inner : '';
  });

  // 2. Process variable placeholders: {{varName}}
  template = template.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, varName) => {
    const val = variables[varName];
    return (val !== undefined && val !== null) ? String(val) : '';
  });

  return template.trim();
}
