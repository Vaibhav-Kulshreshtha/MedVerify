export interface MedicineEntry {
  name: string;
  composition: string;
  manufacturer: string;
}

export const MEDICINES_CATALOG: MedicineEntry[] = [
  { name: 'Dolo 650', composition: 'Paracetamol 650mg', manufacturer: 'Micro Labs Limited' },
  { name: 'Crocin Advance', composition: 'Paracetamol 500mg', manufacturer: 'GlaxoSmithKline Consumer Healthcare' },
  { name: 'Crocin 650', composition: 'Paracetamol 650mg', manufacturer: 'GlaxoSmithKline Consumer Healthcare' },
  { name: 'Combiflam', composition: 'Ibuprofen 400mg + Paracetamol 325mg', manufacturer: 'Sanofi India Limited' },
  { name: 'Tretiva 20', composition: 'Isotretinoin 20mg', manufacturer: 'Intas Pharmaceuticals Ltd / Sun Pharmaceutical Industries Ltd' },
  { name: 'Tretiva 10', composition: 'Isotretinoin 10mg', manufacturer: 'Intas Pharmaceuticals Ltd / Sun Pharmaceutical Industries Ltd' },
  { name: 'Isotroin 20', composition: 'Isotretinoin 20mg', manufacturer: 'Cipla Ltd' },
  { name: 'Azithral 500', composition: 'Azithromycin 500mg', manufacturer: 'Alembic Pharmaceuticals Ltd' },
  { name: 'Azithral 250', composition: 'Azithromycin 250mg', manufacturer: 'Alembic Pharmaceuticals Ltd' },
  { name: 'Azee 500', composition: 'Azithromycin 500mg', manufacturer: 'Cipla Ltd' },
  { name: 'Augmentin 625 Duo', composition: 'Amoxicillin 500mg + Clavulanic Acid 125mg', manufacturer: 'GlaxoSmithKline Pharmaceuticals Ltd' },
  { name: 'Augmentin 1000', composition: 'Amoxicillin 875mg + Clavulanic Acid 125mg', manufacturer: 'GlaxoSmithKline Pharmaceuticals Ltd' },
  { name: 'Clavam 625', composition: 'Amoxicillin 500mg + Clavulanic Acid 125mg', manufacturer: 'Alkem Laboratories Ltd' },
  { name: 'Mox 500', composition: 'Amoxicillin 500mg', manufacturer: 'Sun Pharmaceutical Industries Ltd' },
  { name: 'Pan 40', composition: 'Pantoprazole 40mg', manufacturer: 'Alkem Laboratories Ltd' },
  { name: 'Pan D', composition: 'Pantoprazole 40mg + Domperidone 30mg', manufacturer: 'Alkem Laboratories Ltd' },
  { name: 'Pantocid 40', composition: 'Pantoprazole 40mg', manufacturer: 'Sun Pharmaceutical Industries Ltd' },
  { name: 'Omez 20', composition: 'Omeprazole 20mg', manufacturer: "Dr. Reddy's Laboratories Ltd" },
  { name: 'Omez D', composition: 'Omeprazole 20mg + Domperidone 10mg', manufacturer: "Dr. Reddy's Laboratories Ltd" },
  { name: 'Shelcal 500', composition: 'Calcium 500mg + Vitamin D3 250IU', manufacturer: 'Torrent Pharmaceuticals Ltd' },
  { name: 'Allegra 120', composition: 'Fexofenadine 120mg', manufacturer: 'Sanofi India Limited' },
  { name: 'Allegra 180', composition: 'Fexofenadine 180mg', manufacturer: 'Sanofi India Limited' },
  { name: 'Cetirizine 10', composition: 'Cetirizine Hydrochloride 10mg', manufacturer: 'Cipla Ltd' },
  { name: 'Montair LC', composition: 'Montelukast 10mg + Levocetirizine 5mg', manufacturer: 'Cipla Ltd' },
  { name: 'Telma 40', composition: 'Telmisartan 40mg', manufacturer: 'Glenmark Pharmaceuticals Ltd' },
  { name: 'Telma H', composition: 'Telmisartan 40mg + Hydrochlorothiazide 12.5mg', manufacturer: 'Glenmark Pharmaceuticals Ltd' },
  { name: 'Glycomet 500', composition: 'Metformin 500mg', manufacturer: 'USV Private Limited' },
  { name: 'Glycomet GP 1', composition: 'Glimepiride 1mg + Metformin 500mg', manufacturer: 'USV Private Limited' },
  { name: 'Atorva 10', composition: 'Atorvastatin 10mg', manufacturer: 'Zydus Lifesciences' },
  { name: 'Atorva 20', composition: 'Atorvastatin 20mg', manufacturer: 'Zydus Lifesciences' },
  { name: 'Limcee 500', composition: 'Ascorbic Acid (Vitamin C) 500mg', manufacturer: 'Abbott India Ltd' },
  { name: 'Becosules', composition: 'Vitamin B-Complex with Vitamin C', manufacturer: 'Pfizer India Ltd' },
  { name: 'Voveran SR 100', composition: 'Diclofenac Sodium 100mg', manufacturer: 'Novartis India Ltd' },
  { name: 'Calpol 500', composition: 'Paracetamol 500mg', manufacturer: 'GlaxoSmithKline Pharmaceuticals Ltd' },
  { name: 'Calpol 650', composition: 'Paracetamol 650mg', manufacturer: 'GlaxoSmithKline Pharmaceuticals Ltd' },
  { name: 'Meftal Spas', composition: 'Mefenamic Acid 250mg + Dicyclomine Hydrochloride 10mg', manufacturer: 'Blue Cross Laboratories' },
  { name: 'Monocef 1g', composition: 'Ceftriaxone 1000mg', manufacturer: 'Aristo Pharmaceuticals' },
  { name: 'Taxim-O 200', composition: 'Cefixime 200mg', manufacturer: 'Alkem Laboratories Ltd' },
  { name: 'Cifran 500', composition: 'Ciprofloxacin 500mg', manufacturer: 'Sun Pharmaceutical Industries Ltd' },
  { name: 'Zifi 200', composition: 'Cefixime 200mg', manufacturer: 'FDC Limited' },
  { name: 'Rantac 150', composition: 'Ranitidine 150mg', manufacturer: 'JB Chemicals and Pharmaceuticals' },
  { name: 'Eldoper 2', composition: 'Loperamide 2mg', manufacturer: 'Micro Labs Limited' },
  { name: 'Ascoril D Plus', composition: 'Dextromethorphan + Phenylephrine + Chlorpheniramine', manufacturer: 'Glenmark Pharmaceuticals Ltd' },
  { name: 'Benadryl', composition: 'Diphenhydramine + Ammonium Chloride + Sodium Citrate', manufacturer: 'Johnson & Johnson' },
  { name: 'Digene', composition: 'Magnesium Hydroxide + Aluminium Hydroxide + Simethicone', manufacturer: 'Abbott India Ltd' },
  { name: 'Gelusil', composition: 'Aluminium Hydroxide + Dimethicone + Magnesium Hydroxide', manufacturer: 'Pfizer India Ltd' },
  { name: 'Volini Gel', composition: 'Diclofenac Diethylamine + Virgin Linseed Oil + Methyl Salicylate', manufacturer: 'Sun Pharmaceutical Industries Ltd' },
  { name: 'Moov Ointment', composition: 'Oil of Wintergreen + Pudinah Ka Phool + Tarpin Ka Tel', manufacturer: 'Reckitt Benckiser' },
  { name: 'Ecosprin 75', composition: 'Aspirin 75mg', manufacturer: 'USV Private Limited' },
  { name: 'Ecosprin 150', composition: 'Aspirin 150mg', manufacturer: 'USV Private Limited' },
  { name: 'Crestor 10', composition: 'Rosuvastatin 10mg', manufacturer: 'AstraZeneca India' },
  { name: 'Rozavel 10', composition: 'Rosuvastatin 10mg', manufacturer: 'Sun Pharmaceutical Industries Ltd' },
  { name: 'Januvia 100', composition: 'Sitagliptin 100mg', manufacturer: 'MSD Pharmaceuticals' },
  { name: 'Galvus 50', composition: 'Vildagliptin 50mg', manufacturer: 'Novartis India Ltd' },
  { name: 'Amlovas 5', composition: 'Amlodipine 5mg', manufacturer: 'Mankind Pharma Ltd' },
  { name: 'Ciplox 500', composition: 'Ciprofloxacin 500mg', manufacturer: 'Cipla Ltd' },
  { name: 'Norflox 400', composition: 'Norfloxacin 400mg', manufacturer: 'Cipla Ltd' },
  { name: 'Oflox 200', composition: 'Ofloxacin 200mg', manufacturer: 'Cipla Ltd' },
  { name: 'Zenflox 200', composition: 'Ofloxacin 200mg', manufacturer: 'Mankind Pharma Ltd' },
  { name: 'Liv 52', composition: 'Herbal extracts for hepatoprotection', manufacturer: 'Himalaya Wellness Company' },
  { name: 'Shelcal HD', composition: 'Calcium 500mg + Vitamin D3 500IU', manufacturer: 'Torrent Pharmaceuticals Ltd' },
  { name: 'Neurobion Forte', composition: 'Vitamin B-Complex with Vitamin B12', manufacturer: 'Procter & Gamble Health Ltd' },
  { name: 'Supradyn Daily', composition: 'Multivitamin with Minerals and Trace Elements', manufacturer: 'Bayer Pharmaceuticals' },
  { name: 'Evion 400', composition: 'Tocopheryl Acetate (Vitamin E) 400mg', manufacturer: 'Procter & Gamble Health Ltd' },
  { name: 'Chymoral Forte', composition: 'Trypsin-Chymotrypsin 100000 AU', manufacturer: 'Torrent Pharmaceuticals Ltd' },
  { name: 'Kenacort 40', composition: 'Triamcinolone Acetonide 40mg', manufacturer: 'Abbott India Ltd' },
  { name: 'Betnovate-N', composition: 'Betamethasone Valerate + Neomycin Sulphate', manufacturer: 'GlaxoSmithKline Pharmaceuticals Ltd' },
  { name: 'Fourderm', composition: 'Clobetasol + Neomycin + Miconazole + Chlorocresol', manufacturer: 'Cipla Ltd' },
  { name: 'Candid B', composition: 'Clotrimazole + Beclomethasone Dipropionate', manufacturer: 'Glenmark Pharmaceuticals Ltd' },
  { name: 'Betadine 10%', composition: 'Povidone Iodine 10% w/v', manufacturer: 'Win-Medicare Pvt Ltd' },
  { name: 'Cipcal 500', composition: 'Calcium 500mg + Vitamin D3 250IU', manufacturer: 'Cipla Ltd' },
  { name: 'Thyronorm 50', composition: 'Thyroxine Sodium 50mcg', manufacturer: 'Abbott India Ltd' },
  { name: 'Eltroxin 50', composition: 'Thyroxine Sodium 50mcg', manufacturer: 'GlaxoSmithKline Pharmaceuticals Ltd' },
  { name: 'Nexpro 40', composition: 'Esomeprazole 40mg', manufacturer: 'Torrent Pharmaceuticals Ltd' },
  { name: 'Sompraz 40', composition: 'Esomeprazole 40mg', manufacturer: 'Sun Pharmaceutical Industries Ltd' },
  { name: 'Aciloc 150', composition: 'Ranitidine 150mg', manufacturer: 'Cadila Pharmaceuticals' },
  { name: 'Cyclopam', composition: 'Dicyclomine 20mg + Paracetamol 500mg', manufacturer: 'Indoco Remedies Ltd' },
  { name: 'Combimist-L', composition: 'Levosalbutamol + Ipratropium Bromide', manufacturer: 'Cipla Ltd' },
  { name: 'Asthalin 100', composition: 'Salbutamol 100mcg', manufacturer: 'Cipla Ltd' },
  { name: 'Budecort 200', composition: 'Budesonide 200mcg', manufacturer: 'Cipla Ltd' },
  { name: 'Foracort 200', composition: 'Formoterol Fumarate + Budesonide', manufacturer: 'Cipla Ltd' },
  { name: 'Skinlite', composition: 'Hydroquinone + Tretinoin + Mometasone Furoate', manufacturer: 'Zydus Lifesciences' },
  { name: 'Omnigel', composition: 'Diclofenac Diethylamine + Virgin Linseed Oil', manufacturer: 'Cipla Ltd' },
  { name: 'Sporidex 500', composition: 'Cephalexin 500mg', manufacturer: 'Sun Pharmaceutical Industries Ltd' },
  { name: 'Kefpod 200', composition: 'Cefpodoxime Proxetil 200mg', manufacturer: 'Glenmark Pharmaceuticals Ltd' },
  { name: 'Doxinate', composition: 'Doxylamine Succinate + Pyridoxine', manufacturer: 'Maneesh Pharmaceuticals' },
  { name: 'Pregabalin 75', composition: 'Pregabalin 75mg', manufacturer: 'Torrent Pharmaceuticals Ltd' },
  { name: 'Gabapin 100', composition: 'Gabapentin 100mg', manufacturer: 'Intas Pharmaceuticals' },
  { name: 'Stemetil', composition: 'Prochlorperazine Maleate 5mg', manufacturer: 'Abbott India Ltd' },
  { name: 'Vomitabs', composition: 'Ondansetron 4mg', manufacturer: 'Sun Pharmaceutical Industries Ltd' },
  { name: 'Emeset 4', composition: 'Ondansetron 4mg', manufacturer: 'Cipla Ltd' },
  { name: 'Perinorm 10', composition: 'Metoclopramide 10mg', manufacturer: 'IPCA Laboratories Ltd' },
  { name: 'Dulcoflex 5', composition: 'Bisacodyl 5mg', manufacturer: 'Sanofi India Limited' },
  { name: 'Cremaffin', composition: 'Liquid Paraffin + Milk of Magnesia', manufacturer: 'Abbott India Ltd' },
  { name: 'Isabgol', composition: 'Psyllium Husk Powder', manufacturer: 'Dabur India Ltd' },
  { name: 'Pudin Hara', composition: 'Mentha Oil Extract', manufacturer: 'Dabur India Ltd' },
  { name: 'Septilin', composition: 'Ayurvedic immunomodulatory formulation', manufacturer: 'Himalaya Wellness Company' },
  { name: 'Cystone', composition: 'Herbal formulation for renal calculi', manufacturer: 'Himalaya Wellness Company' },
  { name: 'Livogen', composition: 'Ferrous Fumarate + Folic Acid', manufacturer: 'Procter & Gamble Health Ltd' },
  { name: 'Autrin', composition: 'Ferrous Fumarate + Vitamin B12 + Folic Acid', manufacturer: 'Pfizer India Ltd' },
  { name: 'Orofer XT', composition: 'Ferrous Ascorbate + Folic Acid', manufacturer: 'Emcure Pharmaceuticals' },
  { name: 'Folvite 5', composition: 'Folic Acid 5mg', manufacturer: 'Pfizer India Ltd' },
  { name: 'Zincovit', composition: 'Multivitamin + Multimineral with Grape Seed Extract', manufacturer: 'Apex Laboratories' },
  { name: 'A to Z NS', composition: 'Multivitamins with Minerals and Antioxidants', manufacturer: 'Alkem Laboratories Ltd' },
  { name: 'Becadexamin', composition: 'Multivitamin and Multimineral Capsules', manufacturer: 'GlaxoSmithKline Pharmaceuticals Ltd' },
  { name: 'Electral', composition: 'Oral Rehydration Salts (ORS) WHO Formula', manufacturer: 'FDC Limited' },
  { name: 'Prohance', composition: 'Nutritional Protein Supplement Powder', manufacturer: 'Sun Pharmaceutical Industries Ltd' },
  { name: 'Ensure', composition: 'Complete Balanced Nutrition Supplement', manufacturer: 'Abbott India Ltd' },
  { name: 'Revital H', composition: 'Ginseng with Multivitamins and Minerals', manufacturer: 'Sun Pharmaceutical Industries Ltd' }
];

export function computeLevenshteinSimilarity(s1: string, s2: string): number {
  const str1 = s1.toLowerCase().trim();
  const str2 = s2.toLowerCase().trim();
  if (str1 === str2) return 100;
  if (!str1.length || !str2.length) return 0;

  const track = Array(str2.length + 1).fill(null).map(() =>
    Array(str1.length + 1).fill(null)
  );
  for (let i = 0; i <= str1.length; i += 1) track[0][i] = i;
  for (let j = 0; j <= str2.length; j += 1) track[j][0] = j;

  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  const distance = track[str2.length][str1.length];
  const maxLength = Math.max(str1.length, str2.length);
  return Math.round(((maxLength - distance) / maxLength) * 100);
}

export function matchMedicineInCatalog(ocrText: string) {
  const lowerOcr = ocrText.toLowerCase();
  let bestMatch: MedicineEntry | null = null;
  let highestScore = 0;
  let isTypoSuspect = false;
  const flags: Array<{ issue: string; severity: 'low' | 'medium' | 'high' | 'critical' }> = [];

  // Check each catalog item
  for (const entry of MEDICINES_CATALOG) {
    const brandLower = entry.name.toLowerCase();
    const brandTokens = brandLower.split(' ');

    // Exact word sequence match
    if (lowerOcr.includes(brandLower)) {
      highestScore = 100;
      bestMatch = entry;
      break;
    }

    // Token match
    const primaryToken = brandTokens[0];
    if (primaryToken.length >= 4 && lowerOcr.includes(primaryToken)) {
      const score = 85;
      if (score > highestScore) {
        highestScore = score;
        bestMatch = entry;
      }
    }

    // Fuzzy word match to catch counterfeit typos (e.g. Dollo vs Dolo)
    const ocrWords = lowerOcr.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length >= 4);
    for (const w of ocrWords) {
      const sim = computeLevenshteinSimilarity(w, primaryToken);
      if (sim >= 80 && sim < 100) {
        if (sim > highestScore) {
          highestScore = sim;
          bestMatch = entry;
          isTypoSuspect = true;
        }
      }
    }
  }

  if (isTypoSuspect && bestMatch) {
    flags.push({
      issue: `SUSPECT TRADEMARK TYPO: Detected packaging text resembles registered brand '${bestMatch.name}' but exhibits character discrepancy.`,
      severity: 'high'
    });
  }

  return {
    matched_name: bestMatch?.name || null,
    expected_composition: bestMatch?.composition || null,
    expected_manufacturer: bestMatch?.manufacturer || null,
    similarity: highestScore,
    is_typo_suspect: isTypoSuspect,
    composition_mismatch: false,
    manufacturer_mismatch: false,
    score: highestScore >= 70 ? highestScore : 50,
    flags
  };
}
