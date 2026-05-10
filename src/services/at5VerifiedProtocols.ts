// src/services/at5VerifiedProtocols.ts

export interface VerifiedMapping {
  guid: string;
  aliases: string[];
}

export const VERIFIED_CAB_GUIDS: VerifiedMapping[] = [
  { guid: "7c0b8ce1-cbb4-4e5b-9973-a572143ddb2b", aliases: ["4x12 brit 8000", "4x12 brit 800", "4x12 british 8000", "4x12 british 800", "4x12 british 30", "4x12 brit 75"] },
  { guid: "c4ea21cc-6444-4779-9eee-62d4bc085410", aliases: ["4x12 closed 75 c", "4x12 closed 75c", "4x12 modern m", "4x12 modern m 1", "4x12 modern m1"] },
  { guid: "67f95a0d-34e8-4206-b321-3e57c8d1b407", aliases: ["4x12 modern closed", "4x12 closed modern", "modern closed 4x12"] },
];

export const VERIFIED_SPEAKER_GUIDS: VerifiedMapping[] = [
  { guid: "e372dd04b11d49588c290fbe341e97ca", aliases: ["brit 75", "british 75", "g12t 75", "celestion g12t 75", "75"] },
  { guid: "a56188a9a6bc4373903dbbde779548f1", aliases: ["brit green", "greenback", "greenback g12m", "g12m", "celestion greenback", "celestion g12m"] },
];

export const VERIFIED_MIC_GUIDS: VerifiedMapping[] = [
  { guid: "1e41acc4-85af-4e84-bee4-eabc0be5fef1", aliases: ["dynamic 57", "57", "sm57"] },
  { guid: "9e444286-cab4-46a4-bfa3-a6d55b3ffcfb", aliases: ["condenser 87", "87", "u87"] },
  { guid: "0f35a776-f6db-403d-930f-6b7f42fed749", aliases: ["condenser 414", "414", "c414"] },
  { guid: "cf06582b-4b26-42ce-9491-e00e7ab2481e", aliases: ["ribbon 121", "121", "r121"] },
];
