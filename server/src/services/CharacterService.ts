import { aiClient } from './AiClient';

export interface CharacterPersona {
  id: string;
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporting';
  description: string;
  facialAnchors?: {
    frontAnchorUrl: string;
    sideAnchorUrl: string;
    expressionSheetUrl: string;
    loraModelId: string;
  };
  wardrobe: Array<{ id: string; name: string; category: string; imageUrl?: string }>;
}

export class CharacterService {
  async extractFacialAnchors(characterId: string, charName: string): Promise<CharacterPersona['facialAnchors']> {
    return {
      frontAnchorUrl: `https://lh3.googleusercontent.com/aida-public/AB6AXuAsKwrz3QlbNiuWLZrPgfKEgoPBb_d73lHciGY1q3d8UJiVOtSSlhgdAiZOtFxmi-nQbSnj6EiVqvxnYrh-JvTyGMAUHCWcI_nz_SsAwKo1oTCGrj16XnFM9nXg9g9M71gTUcyHgijSt9lGD7YDlJUhRFqSGeYL8Vyv17Jn3-XpWvciHsoVrwE35Qfylclonh66cXSD7jL-N0C6q54tjtsgCYiC7h5rEVb0yHASJ6nlPmYLElva-c6ERw`,
      sideAnchorUrl: `https://lh3.googleusercontent.com/aida-public/AB6AXuBtkqUzKdcAYE1FhPsRYFIBbnfRkblPXgHUmyY2lO08hNiz9EwgjWw1MyufKF9NAOd561vhT54S9rHPjh7mk5DNdM3bdmAfnJn-oKwmvO7pMxhtB3TNPg-EGe9RK1EPnuZCnS-pCTmPAN6DilaM9Pnjtl5EOHd9QZP7lcBybJui1CzT_WCS5RzXGcrC4Aph9CSWziB0m12r78bXGkolWf3uivcxZyONaKfKL1rZfmc9HqFbpdoOlQsUBA`,
      expressionSheetUrl: `https://lh3.googleusercontent.com/aida-public/AB6AXuAsKwrz3QlbNiuWLZrPgfKEgoPBb_d73lHciGY1q3d8UJiVOtSSlhgdAiZOtFxmi-nQbSnj6EiVqvxnYrh-JvTyGMAUHCWcI_nz_SsAwKo1oTCGrj16XnFM9nXg9g9M71gTUcyHgijSt9lGD7YDlJUhRFqSGeYL8Vyv17Jn3-XpWvciHsoVrwE35Qfylclonh66cXSD7jL-N0C6q54tjtsgCYiC7h5rEVb0yHASJ6nlPmYLElva-c6ERw`,
      loraModelId: `lora_${charName.toLowerCase().replace(/\s+/g, '_')}_v1`,
    };
  }
}

export const characterService = new CharacterService();
