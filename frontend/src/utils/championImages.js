// Champion image utility with fallback handling
const CHAMPION_IMAGE_BASE = 'https://ddragon.leagueoflegends.com/cdn/12.4.1/img/champion';

// Special cases where champion names don't match the image filename
const CHAMPION_IMAGE_OVERRIDES = {
  'Smolder': '/champions/Smolder.png', // Local override for Smolder
  'KSante': '/champions/KSante.png', // Local override for K'Sante (API returns "KSante")
};

export const getChampionImageUrl = (championName) => {
  if (!championName) return null;
  
  // Check for special overrides first
  if (CHAMPION_IMAGE_OVERRIDES[championName]) {
    return CHAMPION_IMAGE_OVERRIDES[championName];
  }
  
  // Default to Data Dragon
  return `${CHAMPION_IMAGE_BASE}/${championName}.png`;
};

export default getChampionImageUrl;
