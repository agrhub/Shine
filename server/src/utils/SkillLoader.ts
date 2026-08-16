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
