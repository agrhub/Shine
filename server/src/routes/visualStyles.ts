import { Router, Request, Response } from 'express';
import { VISUAL_STYLES, VISUAL_STYLE_CATEGORIES, getVisualStyleById, getVisualStylePrompt } from '../constants/VisualStyles.js';

export const visualStylesRouter = Router();

// GET /api/visual-styles — List all visual styles & categories
visualStylesRouter.get('/', (req: Request, res: Response) => {
  const { category, featured } = req.query as { category?: string; featured?: string };

  let list = [...VISUAL_STYLES];
  if (category && category !== 'All') {
    if (category === 'Featured') {
      list = list.filter((s) => s.isFeatured);
    } else {
      list = list.filter((s) => s.category.toLowerCase() === category.toLowerCase());
    }
  }

  if (featured === 'true') {
    list = list.filter((s) => s.isFeatured);
  }

  return res.json({
    code: 200,
    data: {
      styles: list,
      categories: VISUAL_STYLE_CATEGORIES,
      total: list.length,
    },
    message: 'Visual styles loaded successfully',
    error: null,
  });
});

// GET /api/visual-styles/:id — Get details of a specific visual style
visualStylesRouter.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const style = getVisualStyleById(id);

  return res.json({
    code: 200,
    data: {
      ...style,
      resolvedPromptModifier: getVisualStylePrompt(id),
    },
    message: 'Visual style details loaded successfully',
    error: null,
  });
});
