/**
 * Bangla Linguistic, Morphology, Phonetics, Rhyme & TTS Engine
 * For Bangla Magnetic Word Kit (ছড়ার চুম্বক)
 */

(function () {
  const VOWELS = {
    'অ': 'o', 'আ': 'a', 'ই': 'i', 'ঈ': 'i', 'উ': 'u', 'ঊ': 'u',
    'ঋ': 'ri', 'এ': 'e', 'ঐ': 'oi', 'ও': 'o', 'ঔ': 'ou'
  };

  const KARS = {
    'া': 'a', 'ি': 'i', 'ী': 'i', 'ু': 'u', 'ূ': 'u',
    'ৃ': 'ri', 'ে': 'e', 'ৈ': 'oi', 'ো': 'o', 'ৌ': 'ou'
  };

  const VOWEL_TO_KAR = {
    'আ': 'া', 'ই': 'ি', 'ঈ': 'ী', 'উ': 'ু', 'ঊ': 'ূ',
    'ঋ': 'ৃ', 'এ': 'ে', 'ঐ': 'ৈ', 'ও': 'ো', 'ঔ': 'ৌ'
  };

  const CONSONANTS = {
    'ক': 'k', 'খ': 'kh', 'গ': 'g', 'ঘ': 'gh', 'ঙ': 'ng',
    'চ': 'ch', 'ছ': 'chh', 'জ': 'j', 'ঝ': 'jh', 'ঞ': 'n',
    'ট': 't', 'ঠ': 'th', 'ড': 'd', 'ঢ': 'dh', 'ণ': 'n',
    'ত': 't', 'থ': 'th', 'দ': 'd', 'ধ': 'dh', 'ন': 'n',
    'প': 'p', 'ফ': 'ph', 'ব': 'b', 'ভ': 'bh', 'ম': 'm',
    'য': 'j', 'র': 'r', 'ল': 'l', 'শ': 'sh', 'ষ': 'sh', 'স': 'sh', 'হ': 'h',
    'ড়': 'r', 'ঢ়': 'rh', 'য়': 'y', 'ৎ': 't'
  };

  // Build fast lookup map from BANGLA_KIT_DATA
  const phoneticCache = new Map();
  if (window.BANGLA_KIT_DATA && window.BANGLA_KIT_DATA.words) {
    for (const item of window.BANGLA_KIT_DATA.words) {
      phoneticCache.set(item.w, item.p);
    }
  }

  // Extra phonetic overrides for conjugated forms and pronouns
  const EXTRA_PHONETICS = {
    'আমি': 'ami', 'আমরা': 'amra', 'তুমি': 'tumi', 'তোমরা': 'tomra',
    'তুই': 'tui', 'তোরা': 'tora', 'সে': 'she', 'তারা': 'tara',
    'আপনি': 'apni', 'আপনারা': 'apnara', 'তিনি': 'tini', 'তাঁরা': 'tanra',
    'করি': 'kori', 'করো': 'koro', 'করিস': 'korish', 'করে': 'kore', 'করেন': 'koren',
    'করছি': 'korchhi', 'করছো': 'korchho', 'করছিস': 'korchhish', 'করছে': 'korchhe', 'করছেন': 'korchhen',
    'করেছি': 'korechhi', 'করেছো': 'korechho', 'করেছিস': 'korechhish', 'করেছে': 'korechhe', 'করেছেন': 'korechhen',
    'করলাম': 'korlam', 'করলে': 'korle', 'করলি': 'korli', 'করলো': 'korlo', 'করলেন': 'korlen',
    'করব': 'korbo', 'করবো': 'korbo', 'করবে': 'korbe', 'করবি': 'korbi', 'করবেন': 'korben',
    'যাই': 'jai', 'যাও': 'jao', 'যাস': 'jash', 'যায়': 'jay', 'যান': 'jan',
    'যাচ্ছি': 'jachchhi', 'যাচ্ছো': 'jachchho', 'যাচ্ছিস': 'jachchhish', 'যাচ্ছে': 'jachchhe', 'যাচ্ছেন': 'jachchhen',
    'গিয়েছি': 'giyechhi', 'গিয়েছো': 'giyechho', 'গিয়েছে': 'giyechhe', 'গেছি': 'gechhi', 'গেছে': 'gechhe',
    'গেলাম': 'gelam', 'গেলে': 'gele', 'গেলি': 'geli', 'গেল': 'gelo', 'গেলেন': 'gelen',
    'যাবো': 'jabo', 'যাব': 'jabo', 'যাবে': 'jabe', 'যাবি': 'jabi', 'যাবেন': 'jaben',
    'আসি': 'ashi', 'এসো': 'esho', 'আয়': 'aay', 'আসে': 'ashe', 'আসেন': 'ashen',
    'আসছি': 'ashchhi', 'আসছো': 'ashchho', 'আসছে': 'ashchhe', 'এসেছি': 'eshechhi', 'এসেছে': 'eshechhe',
    'এলাম': 'elam', 'এলে': 'ele', 'এলি': 'eli', 'এলো': 'elo', 'এল': 'elo', 'আসবো': 'ashbo', 'আসবে': 'ashbe',
    'খাই': 'khai', 'খাও': 'khao', 'খাস': 'khash', 'খায়': 'khay', 'খান': 'khan',
    'খাচ্ছি': 'khachchhi', 'খাচ্ছে': 'khachchhe', 'খেয়েছি': 'kheyechhi', 'খেয়েছে': 'kheyechhe',
    'খেলাম': 'khelam', 'খেলে': 'khele', 'খেলো': 'khelo', 'খাবো': 'khabo', 'খাবে': 'khabe',
    'দিই': 'dii', 'দাও': 'dao', 'দিস': 'dish', 'দেয়': 'dey', 'দেন': 'den',
    'দিচ্ছি': 'dichchhi', 'দিচ্ছে': 'dichchhe', 'দিয়েছি': 'diyechhi', 'দিয়েছে': 'diyechhe',
    'দিলাম': 'dilam', 'দিলে': 'dile', 'দিল': 'dilo', 'দেবো': 'debo', 'দেব': 'debo', 'দেবে': 'debe',
    'হই': 'hoi', 'হও': 'hoo', 'হস': 'hosh', 'হয়': 'hoy', 'হন': 'hon',
    'হচ্ছি': 'hochchhi', 'হচ্ছে': 'hochchhe', 'হয়েছি': 'hoyechhi', 'হয়েছে': 'hoyechhe',
    'হলাম': 'holam', 'হলে': 'hole', 'হল': 'holo', 'হবো': 'hobo', 'হব': 'hobo', 'হবে': 'hobe'
  };
  for (const [k, v] of Object.entries(EXTRA_PHONETICS)) {
    phoneticCache.set(k, v);
  }

  const CONJUNCT_REPS = [
    ['ক্ষ', 'kkh'], ['জ্ঞ', 'gg'], ['ঞ্চ', 'nch'], ['ঞ্জ', 'nj'],
    ['ণ্ড', 'nd'], ['ন্ড', 'nd'], ['ন্ত', 'nt'], ['ন্দ', 'nd'],
    ['ন্ধ', 'ndh'], ['ম্প', 'mp'], ['ম্ব', 'mb'], ['ম্ভ', 'mbh'],
    ['ঙ্গ', 'ngg'], ['ঙ্ক', 'nk'], ['ষ্ট', 'sht'], ['ষ্ঠ', 'shth'],
    ['স্ত', 'st'], ['স্থ', 'sth'], ['স্প', 'sp'], ['স্ফ', 'sph'],
    ['স্ব', 'sh'], ['স্ম', 'shm'], ['স্ন', 'sn'], ['শ্ন', 'shn'],
    ['শ্র', 'shr'], ['প্র', 'pr'], ['ব্র', 'br'], ['ভ্র', 'bhr'],
    ['ক্র', 'kr'], ['গ্র', 'gr'], ['ট্র', 'tr'], ['ড্র', 'dr'],
    ['ত্র', 'tr'], ['দ্র', 'dr'], ['ধ্র', 'dhr'], ['ম্র', 'mr'],
    ['ক্ল', 'kl'], ['প্ল', 'pl'], ['গ্ল', 'gl'], ['ব্ল', 'bl'],
    ['দ্ব', 'dw'], ['ধ্ব', 'dhw'], ['ত্ব', 'tt'], ['ত্থ', 'tth'],
    ['দ্দ', 'dd'], ['দ্ধ', 'ddh'], ['ত্ত', 'tt'], ['ক্ক', 'kk'],
    ['চ্চ', 'chch'], ['চ্ছ', 'chchh'], ['জ্জ', 'jj'], ['ট্ট', 'tt'],
    ['ড্ড', 'dd'], ['ন্ন', 'nn'], ['প্প', 'pp'], ['ব্ব', 'bb'],
    ['ম্ম', 'mm'], ['ল্ল', 'll'], ['শ্ম', 'shm'], ['হ্ম', 'mm']
  ];

  function transliterate(word) {
    if (!word) return '';
    const w = word.trim().replace(/[\u200c\u200d]/g, '');
    if (phoneticCache.has(w)) return phoneticCache.get(w);

    const res = [];
    let i = 0;
    const n = w.length;
    while (i < n) {
      const ch = w[i];
      if (VOWELS[ch]) {
        res.push(VOWELS[ch]);
        i++;
      } else if (CONSONANTS[ch]) {
        if (i + 2 < n && w[i + 1] === '্') {
          const c2 = w[i + 2];
          let matched = null;
          for (const [pat, rep] of CONJUNCT_REPS) {
            if (w.startsWith(pat, i)) {
              matched = [pat.length, rep];
              break;
            }
          }
          if (matched) {
            res.push(matched[1]);
            i += matched[0];
            if (i < n && KARS[w[i]]) {
              res.push(KARS[w[i]]);
              i++;
            } else if (i < n && w[i] === 'ঁ') {
              res.push('n');
              i++;
              if (i < n && KARS[w[i]]) {
                res.push(KARS[w[i]]);
                i++;
              } else {
                res.push('o');
              }
            } else if (i < n) {
              res.push('o');
            }
            continue;
          } else if (c2 === 'য') {
            res.push(CONSONANTS[ch]);
            i += 3;
            if (i < n && KARS[w[i]]) {
              res.push(w[i] === 'া' ? 'ya' : KARS[w[i]]);
              i++;
            } else {
              res.push('o');
            }
            continue;
          } else if (c2 === 'ব') {
            res.push(CONSONANTS[ch]);
            i += 3;
            if (i < n && KARS[w[i]]) {
              res.push(KARS[w[i]]);
              i++;
            } else {
              res.push('o');
            }
            continue;
          } else if (c2 === 'র') {
            res.push(CONSONANTS[ch] + 'r');
            i += 3;
            if (i < n && KARS[w[i]]) {
              res.push(KARS[w[i]]);
              i++;
            } else {
              res.push('o');
            }
            continue;
          } else {
            res.push(CONSONANTS[ch]);
            i += 2;
            continue;
          }
        }
        res.push(CONSONANTS[ch]);
        i++;
        if (i < n && w[i] === 'ঁ') {
          i++;
          if (i < n && KARS[w[i]]) {
            res.push('n' + KARS[w[i]]);
            i++;
          } else {
            res.push('no');
          }
        } else if (i < n && KARS[w[i]]) {
          res.push(KARS[w[i]]);
          i++;
          if (i < n && w[i] === 'ঁ') {
            res.push('n');
            i++;
          }
        } else if (i < n && w[i] === '্') {
          i++;
        } else {
          if (i < n || w.length === 1) {
            res.push('o');
          }
        }
      } else if (KARS[ch]) {
        res.push(KARS[ch]);
        i++;
      } else if (ch === 'ং') {
        res.push('ng');
        i++;
      } else if (ch === 'ঃ') {
        res.push('h');
        i++;
      } else if (ch === 'ঁ') {
        res.push('n');
        i++;
      } else if (ch === '্') {
        i++;
      } else {
        res.push(ch);
        i++;
      }
    }
    const out = res.join('') || w;
    phoneticCache.set(w, out);
    return out;
  }

  function endsWithVowelOrKar(w) {
    if (!w) return false;
    const last = w[w.length - 1];
    return Boolean(KARS[last] || VOWELS[last]);
  }

  /**
   * Smart Bangla Morphology Joiner: fuses a base word and a suffix/ending magnet
   * e.g., মাছ + এ = মাছে, বুন + এছি = বুনেছি, বেঁধে + ছে = বেঁধেছে, চাঁদ + র = চাঁদের
   */
  function joinWordAndEnding(baseWord, rawEnding) {
    if (!baseWord) return rawEnding || '';
    if (!rawEnding) return baseWord;
    let base = baseWord.trim();
    let ending = rawEnding.trim().replace(/^-+/, '');
    if (!ending) return base;

    // Special pronoun bases
    if (base === 'আমি' && (ending === 'র' || ending === 'এর')) return 'আমার';
    if (base === 'আমি' && ending === 'দের') return 'আমাদের';
    if (base === 'আমি' && ending === 'কে') return 'আমাকে';
    if (base === 'তুমি' && (ending === 'র' || ending === 'এর')) return 'তোমার';
    if (base === 'তুমি' && ending === 'দের') return 'তোমাদের';
    if (base === 'তুমি' && ending === 'কে') return 'তোমাকে';
    if (base === 'তুই' && (ending === 'র' || ending === 'এর')) return 'তোর';
    if (base === 'সে' && (ending === 'র' || ending === 'এর')) return 'তার';
    if (base === 'সে' && ending === 'কে') return 'তাকে';

    // Strip trailing hasanta if present on base
    if (base.endsWith('্')) {
      base = base.slice(0, -1);
    }

    const baseEndsVowel = endsWithVowelOrKar(base);
    const firstChar = ending[0];

    // Possessive '-র' on a consonant-ending word becomes '-এর' (ের)
    if (ending === 'র' && !baseEndsVowel) {
      return base + 'ের';
    }
    // '-রা' plural on consonant-ending word often takes '-এরা' (যেমন মাছ + রা = মাছেরা, ছেলেরা)
    if (ending === 'রা' && !baseEndsVowel) {
      return base + 'েরা';
    }
    // '-য়' on a consonant-ending word becomes '-এ' (ে)
    if (ending === 'য়' && !baseEndsVowel) {
      return base + 'ে';
    }

    // If ending starts with an independent vowel (অ, আ, ই, ঈ, উ, ঊ, ঋ, এ, ঐ, ও, ঔ)
    if (VOWELS[firstChar]) {
      const rest = ending.slice(1);
      if (!baseEndsVowel) {
        // Convert leading vowel to Kar (or inherent vowel for 'অ')
        const kar = VOWEL_TO_KAR[firstChar] || '';
        return base + kar + rest;
      } else {
        // Base already ends in a vowel or kar
        const lastChar = base[base.length - 1];
        // e.g. পা + এ = পায়ে, মা + এ = মায়ে, খা + এ = খেয়ে, কিন্তু চা + ই = চাই, না + ই = নাই
        if (ending === 'এ' && (lastChar === 'া' || lastChar === 'ো' || lastChar === 'ু' || VOWELS[lastChar])) {
          return base + 'য়ে';
        }
        if (ending === 'এর' && (lastChar === 'া' || lastChar === 'ো')) {
          return base + 'র';
        }
        if (ending === 'এর' && (lastChar === 'ি' || lastChar === 'ী' || lastChar === 'ে')) {
          return base + 'র';
        }
        // If base ends in 'ে' and ending starts with 'এ' (e.g., বেঁধে + এছি -> বেঁধেছি)
        if (lastChar === 'ে' && firstChar === 'এ') {
          return base + rest;
        }
        // If base ends in 'া' and ending starts with 'আ' (e.g., দাঁড়া + আয় -> দাঁড়ায়)
        if (lastChar === 'া' && firstChar === 'আ') {
          return base + rest;
        }
        return base + ending;
      }
    }

    // Ending starts with a consonant (ছে, ছি, ছো, ছিলাম, তে, টা, টি, গুলো, দের, লাম, লে, বো, বে...)
    // Special case: verb root ending in consonant + 'ছে'/'ছি'/'ছো'/'ছিলাম' in Present Perfect vs Continuous
    return base + ending;
  }

  /**
   * Irregular & High-Frequency Verb Conjugation Table
   * Keys are canonical roots (ধাতু)
   */
  const IRREGULAR_VERBS = {
    'যা': {
      label: 'যাওয়া (to go)',
      pres: { 'আমি': 'যাই', 'তুমি': 'যাও', 'তুই': 'যাস', 'সে': 'যায়', 'আপনি': 'যান' },
      cont: { 'আমি': 'যাচ্ছি', 'তুমি': 'যাচ্ছো', 'তুই': 'যাচ্ছিস', 'সে': 'যাচ্ছে', 'আপনি': 'যাচ্ছেন' },
      perf: { 'আমি': 'গিয়েছি', 'তুমি': 'গিয়েছো', 'তুই': 'গিয়েছিস', 'সে': 'গিয়েছে', 'আপনি': 'গিয়েছেন' },
      past: { 'আমি': 'গেলাম', 'তুমি': 'গেলে', 'তুই': 'গেলি', 'সে': 'গেল', 'আপনি': 'গেলেন' },
      pcont: { 'আমি': 'যাচ্ছিলাম', 'তুমি': 'যাচ্ছিলে', 'তুই': 'যাচ্ছিলি', 'সে': 'যাচ্ছিল', 'আপনি': 'যাচ্ছিলেন' },
      fut: { 'আমি': 'যাবো', 'তুমি': 'যাবে', 'তুই': 'যাবি', 'সে': 'যাবে', 'আপনি': 'যাবেন' },
      other: ['যা', 'গিয়ে', 'যেতে', 'গেলে', 'গেলেম', 'গেছে', 'গেছি']
    },
    'আস': {
      label: 'আসা (to come)',
      pres: { 'আমি': 'আসি', 'তুমি': 'এসো', 'তুই': 'আয়', 'সে': 'আসে', 'আপনি': 'আসেন' },
      cont: { 'আমি': 'আসছি', 'তুমি': 'আসছো', 'তুই': 'আসছিস', 'সে': 'আসছে', 'আপনি': 'আসছেন' },
      perf: { 'আমি': 'এসেছি', 'তুমি': 'এসেছো', 'তুই': 'এসেছিস', 'সে': 'এসেছে', 'আপনি': 'এসেছেন' },
      past: { 'আমি': 'এলাম', 'তুমি': 'এলে', 'তুই': 'এলি', 'সে': 'এল', 'আপনি': 'এলেন' },
      pcont: { 'আমি': 'আসছিলাম', 'তুমি': 'আসছিলে', 'তুই': 'আসছিলি', 'সে': 'আসছিল', 'আপনি': 'আসছিলেন' },
      fut: { 'আমি': 'আসবো', 'তুমি': 'আসবে', 'তুই': 'আসবি', 'সে': 'আসবে', 'আপনি': 'আসবেন' },
      other: ['আয়', 'আয়রে', 'এসে', 'আসতে', 'আসলে', 'এলেম', 'আসিব']
    },
    'খা': {
      label: 'খাওয়া (to eat)',
      pres: { 'আমি': 'খাই', 'তুমি': 'খাও', 'তুই': 'খাস', 'সে': 'খায়', 'আপনি': 'খান' },
      cont: { 'আমি': 'খাচ্ছি', 'তুমি': 'খাচ্ছো', 'তুই': 'খাচ্ছিস', 'সে': 'খাচ্ছে', 'আপনি': 'খাচ্ছেন' },
      perf: { 'আমি': 'খেয়েছি', 'তুমি': 'খেয়েছো', 'তুই': 'খেয়েছিস', 'সে': 'খেয়েছে', 'আপনি': 'খেয়েছেন' },
      past: { 'আমি': 'খেলাম', 'তুমি': 'খেলে', 'তুই': 'খেলি', 'সে': 'খেল', 'আপনি': 'খেলেন' },
      pcont: { 'আমি': 'খাচ্ছিলাম', 'তুমি': 'খাচ্ছিলে', 'তুই': 'খাচ্ছিলি', 'সে': 'খাচ্ছিল', 'আপনি': 'খাচ্ছিলেন' },
      fut: { 'আমি': 'খাবো', 'তুমি': 'খাবে', 'তুই': 'খাবি', 'সে': 'খাবে', 'আপনি': 'খাবেন' },
      other: ['খা', 'খেয়ে', 'খেতে', 'খাইয়ে', 'খাবার']
    },
    'দে': {
      label: 'দেওয়া (to give)',
      pres: { 'আমি': 'দিই', 'তুমি': 'দাও', 'তুই': 'দে', 'সে': 'দেয়', 'আপনি': 'দেন' },
      cont: { 'আমি': 'দিচ্ছি', 'তুমি': 'দিচ্ছো', 'তুই': 'দিচ্ছিস', 'সে': 'দিচ্ছে', 'আপনি': 'দিচ্ছেন' },
      perf: { 'আমি': 'দিয়েছি', 'তুমি': 'দিয়েছো', 'তুই': 'দিয়েছিস', 'সে': 'দিয়েছে', 'আপনি': 'দিয়েছেন' },
      past: { 'আমি': 'দিলাম', 'তুমি': 'দিলে', 'তুই': 'দিলি', 'সে': 'দিল', 'আপনি': 'দিলেন' },
      pcont: { 'আমি': 'দিচ্ছিলাম', 'তুমি': 'দিচ্ছিলে', 'তুই': 'দিচ্ছিলি', 'সে': 'দিচ্ছিল', 'আপনি': 'দিচ্ছিলেন' },
      fut: { 'আমি': 'দেব', 'তুমি': 'দেবে', 'তুই': 'দিবি', 'সে': 'দেবে', 'আপনি': 'দেবেন' },
      other: ['দে', 'দিয়ে', 'দিতে', 'দিলে', 'দেওয়া']
    },
    'নে': {
      label: 'নেওয়া (to take)',
      pres: { 'আমি': 'নিই', 'তুমি': 'নাও', 'তুই': 'নে', 'সে': 'নেয়', 'আপনি': 'নেন' },
      cont: { 'আমি': 'নিচ্ছি', 'তুমি': 'নিচ্ছো', 'তুই': 'নিচ্ছিস', 'সে': 'নিচ্ছে', 'আপনি': 'নিচ্ছেন' },
      perf: { 'আমি': 'নিয়েছি', 'তুমি': 'নিয়েছো', 'তুই': 'নিয়েছিস', 'সে': 'নিয়েছে', 'আপনি': 'নিয়েছেন' },
      past: { 'আমি': 'নিলাম', 'তুমি': 'নিলে', 'তুই': 'নিলি', 'সে': 'নিল', 'আপনি': 'নিলেন' },
      pcont: { 'আমি': 'নিচ্ছিলাম', 'তুমি': 'নিচ্ছিলে', 'তুই': 'নিচ্ছিলি', 'সে': 'নিচ্ছিল', 'আপনি': 'নিচ্ছিলেন' },
      fut: { 'আমি': 'নেব', 'তুমি': 'নেবে', 'তুই': 'নিবি', 'সে': 'নেবে', 'আপনি': 'নেবেন' },
      other: ['নে', 'নিয়ে', 'নিতে', 'নিলে', 'নেওয়া']
    },
    'হ': {
      label: 'হওয়া (to be / become)',
      pres: { 'আমি': 'হই', 'তুমি': 'হও', 'তুই': 'হস', 'সে': 'হয়', 'আপনি': 'হন' },
      cont: { 'আমি': 'হচ্ছি', 'তুমি': 'হচ্ছো', 'তুই': 'হচ্ছিস', 'সে': 'হচ্ছে', 'আপনি': 'হচ্ছেন' },
      perf: { 'আমি': 'হয়েছি', 'তুমি': 'হয়েছো', 'তুই': 'হয়েছিস', 'সে': 'হয়েছে', 'আপনি': 'হয়েছেন' },
      past: { 'আমি': 'হলাম', 'তুমি': 'হলে', 'তুই': 'হলি', 'সে': 'হল', 'আপনি': 'হলেন' },
      pcont: { 'আমি': 'হচ্ছিলাম', 'তুমি': 'হচ্ছিলে', 'তুই': 'হচ্ছিলি', 'সে': 'হচ্ছিল', 'আপনি': 'হচ্ছিলেন' },
      fut: { 'আমি': 'হব', 'তুমি': 'হবে', 'তুই': 'হবি', 'সে': 'হবে', 'আপনি': 'হবেন' },
      other: ['হয়ে', 'হতে', 'হলে', 'হোক', 'হবার']
    },
    'আছ': {
      label: 'থাকা / আছ (to be / stay)',
      pres: { 'আমি': 'আছি', 'তুমি': 'আছো', 'তুই': 'আছিস', 'সে': 'আছে', 'আপনি': 'আছেন' },
      cont: { 'আমি': 'থাকছি', 'তুমি': 'থাকছো', 'তুই': 'থাকছিস', 'সে': 'থাকছে', 'আপনি': 'থাকছেন' },
      perf: { 'আমি': 'থেকেছি', 'তুমি': 'থেকেছো', 'তুই': 'থেকেছিস', 'সে': 'থেকেছে', 'আপনি': 'থেকেছেন' },
      past: { 'আমি': 'ছিলাম', 'তুমি': 'ছিলে', 'তুই': 'ছিলি', 'সে': 'ছিল', 'আপনি': 'ছিলেন' },
      pcont: { 'আমি': 'থাকছিলাম', 'তুমি': 'থাকছিলে', 'তুই': 'থাকছিলি', 'সে': 'থাকছিল', 'আপনি': 'থাকছিলেন' },
      fut: { 'আমি': 'থাকবো', 'তুমি': 'থাকবে', 'তুই': 'থাকবি', 'সে': 'থাকবে', 'আপনি': 'থাকবেন' },
      other: ['থাক', 'থেকে', 'থাকতে', 'থাকলে']
    }
  };

  // Map common surface forms back to their canonical verb root
  const SURFACE_TO_VERB_ROOT = {
    'যাই': 'যা', 'যাও': 'যা', 'যাস': 'যা', 'যায়': 'যা', 'যান': 'যা', 'যাচ্ছি': 'যা', 'যাচ্ছ': 'যা', 'যাচ্ছে': 'যা', 'গেল': 'যা', 'গেলেম': 'যা', 'গেলাম': 'যা', 'গেছ': 'যা', 'গেছে': 'যা', 'গিয়ে': 'যা', 'যাব': 'যা', 'যাবে': 'যা', 'যেতে': 'যা',
    'আয়': 'আস', 'আয়রে': 'আস', 'আসি': 'আস', 'এসো': 'আস', 'এস': 'আস', 'আসে': 'আস', 'এল': 'আস', 'এলেম': 'আস', 'আসলো': 'আস', 'আসিব': 'আস', 'আসিতেছে': 'আস', 'আসতেছে': 'আস', 'এসে': 'আস', 'এলি': 'আস',
    'খাই': 'খা', 'খাও': 'খা', 'খায়': 'খা', 'খান': 'খা', 'খেয়েছে': 'খা', 'খেয়ে': 'খা', 'খাইয়ে': 'খা',
    'দিই': 'দে', 'দেই': 'দে', 'দাও': 'দে', 'দেয়': 'দে', 'দেব': 'দে', 'দেবে': 'দে', 'দিল': 'দে', 'দিয়ে': 'দে',
    'নিই': 'নে', 'নাও': 'নে', 'নেয়': 'নে', 'নিচ্ছ': 'নে', 'নিয়ে': 'নে', 'নেব': 'নে',
    'হই': 'হ', 'হয়': 'হ', 'হব': 'হ', 'হবে': 'হ', 'হল': 'হ', 'হলে': 'হ', 'হলেই': 'হ', 'হোক': 'হ', 'হত': 'হ', 'হতে': 'হ', 'হয়ে': 'হ',
    'আছি': 'আছ', 'আছ': 'আছ', 'আছে': 'আছ', 'ছিল': 'আছ', 'ছিলে': 'আছ', 'ছিলাম': 'আছ',
    'বেঁধেছে': 'বাঁধ', 'বেঁধে': 'বাঁধ', 'বাঁধলো': 'বাঁধ',
    'নেমেছে': 'নাম', 'নেমে': 'নাম', 'নামে': 'নাম',
    'উঠেছে': 'উঠ', 'উঠে': 'উঠ', 'উঠব': 'উঠ', 'উঠলে': 'উঠ', 'উঠিয়া': 'উঠ',
    'দেখেছে': 'দেখ', 'দেখে': 'দেখ', 'দেখি': 'দেখ', 'দেখব': 'দেখ', 'দেখিবে': 'দেখ',
    'মেরেছে': 'মার', 'মেরে': 'মার', 'মারে': 'মার',
    'লেগেছে': 'লাগ', 'লেগে': 'লাগ', 'লাগে': 'লাগ',
    'বুনেছি': 'বুন', 'বুনি': 'বুন',
    'পড়ে': 'পড়', 'পড়েছি': 'পড়', 'পড়ল': 'পড়', 'পড়বি': 'পড়',
    'চলেছে': 'চল', 'চলে': 'চল', 'চলি': 'চল', 'চলব': 'চল', 'চলতে': 'চল',
    'নাচে': 'নাচ', 'নাচি': 'নাচ',
    'বাজে': 'বাজ', 'বাজায়': 'বাজ', 'বাজিয়ে': 'বাজ',
    'বলে': 'বল', 'বলি': 'বল', 'বলব': 'বল', 'বলবো': 'বল', 'বলছি': 'বল', 'বলছ': 'বল', 'বললে': 'বল', 'বলতে': 'বল',
    'করে': 'কর', 'করি': 'কর', 'করো': 'কর', 'করছ': 'কর', 'করলে': 'কর', 'করবে': 'কর',
    'ঘুমাল': 'ঘুমা', 'ঘুমায়': 'ঘুমা', 'ঘুমো': 'ঘুমা', 'ঘুমিয়ে': 'ঘুমা',
    'জেগে': 'জাগ', 'জাগি': 'জাগ', 'জাগাল': 'জাগ', 'জাগবে': 'জাগ',
    'দাঁড়িয়ে': 'দাঁড়া', 'দাঁড়াও': 'দাঁড়া',
    'ছাড়িয়ে': 'ছাড়', 'ছাড়ি': 'ছাড়', 'ছেড়ে': 'ছাড়',
    'ভেসে': 'ভাস', 'ভাসে': 'ভাস',
    'কেটে': 'কাট', 'কাটে': 'কাট', 'কাটলে': 'কাট',
    'ডাকি': 'ডাক', 'ডাকে': 'ডাক', 'ডেকে': 'ডাক', 'ডাকিতেছে': 'ডাক',
    'শুনি': 'শুন', 'শোনে': 'শুন', 'শুনে': 'শুন', 'শুনিবে': 'শুন',
    'শিখছি': 'শিখ', 'শিখায়': 'শিখ', 'শিখাল': 'শিখ',
    'উড়ে': 'উড়', 'ওড়ে': 'উড়', 'উড়তে': 'উড়', 'উড়িয়ে': 'উড়',
    'ছুটে': 'ছুট', 'ছোটে': 'ছুট', 'ছুটবে': 'ছুট', 'ছুটিয়ে': 'ছুট',
    'ঘুরে': 'ঘুর', 'বেড়ায়': 'বেড়া', 'বেড়িয়ে': 'বেড়া',
    'চড়ে': 'চড়', 'চড়েছি': 'চড়', 'ধরে': 'ধর', 'ধরেছি': 'ধর',
    'ফেলে': 'ফেল', 'রেখে': 'রাখ', 'রাখি': 'রাখ',
    'পাই': 'পা', 'পায়': 'পা', 'পাবে': 'পা', 'পেলাম': 'পা', 'পেল': 'পা', 'পেয়েছ': 'পা'
  };

  /**
   * Computes high-vowel (সমাপিকা/অসমাপিকা ই/এ কার) mutated stem for regular Bangla verbs
   * e.g., কর -> করে, বল -> বলে, দেখ -> দেখে, শুন -> শুনে, উঠ -> উঠে, বাঁধ -> বেঁধে, নাম -> নেমে, কাট -> কেটে, ছাড় -> ছেড়ে, মার -> মেরে, লাগ -> লেগে, ভাস -> ভেসে, হাস -> হেসে
   */
  const PERFECT_STEM_MAP = {
    'বাঁধ': 'বেঁধে', 'নাম': 'নেমে', 'কাট': 'কেটে', 'ছাড়': 'ছেড়ে',
    'মার': 'মেরে', 'লাগ': 'লেগে', 'ভাস': 'ভেসে', 'হাস': 'হেসে',
    'ডাক': 'ডেকে', 'রাখ': 'রেখে', 'ভাঙ': 'ভেঙে', 'জান': 'জেনে',
    'মান': 'মেনে', 'টান': 'টেনে', 'আন': 'এনে', 'কাঁদ': 'কেঁদে',
    'কাঁপ': 'কেঁপে', 'হাঁট': 'হেঁটে', 'নাচ': 'নেচে', 'বাজ': 'বেজে',
    'জাগ': 'জেগে', 'থাক': 'থেকে', 'থাম': 'থেমে', 'মাখ': 'মেখে'
  };

  function getPerfectStem(root) {
    if (PERFECT_STEM_MAP[root]) return PERFECT_STEM_MAP[root];
    if (endsWithVowelOrKar(root)) {
      if (root.endsWith('া')) {
        // e.g. ঘুমা -> ঘুমিয়ে, দাঁড়া -> দাঁড়িয়ে, বেড়া -> বেড়িয়ে
        return root.slice(0, -1) + 'িয়ে';
      }
      return root + 'য়ে';
    }
    return root + 'ে';
  }

  function conjugateVerb(wordOrRoot) {
    const clean = (wordOrRoot || '').trim();
    const root = SURFACE_TO_VERB_ROOT[clean] || clean;

    if (IRREGULAR_VERBS[root]) {
      return { root, ...IRREGULAR_VERBS[root] };
    }

    // Check if root ends in 'া' (causative / 2-syllable like ঘুমা, দাঁড়া, বেড়া, সাঁতরা, পালা, বানা, ফোটা)
    if (root.endsWith('া')) {
      const stemIye = root.slice(0, -1) + 'িয়ে';
      return {
        root,
        label: `${root}নো (Verb)`,
        pres: { 'আমি': root + 'ই', 'তুমি': root + 'ও', 'তুই': root + 'স', 'সে': root + 'য়', 'আপনি': root + 'ন' },
        cont: { 'আমি': root + 'চ্ছি', 'তুমি': root + 'চ্ছো', 'তুই': root + 'চ্ছিস', 'সে': root + 'চ্ছে', 'আপনি': root + 'চ্ছেন' },
        perf: { 'আমি': stemIye + 'ছি', 'তুমি': stemIye + 'ছো', 'তুই': stemIye + 'ছিস', 'সে': stemIye + 'ছে', 'আপনি': stemIye + 'ছেন' },
        past: { 'আমি': root + 'লাম', 'তুমি': root + 'লে', 'তুই': root + 'লি', 'সে': root + 'ল', 'আপনি': root + 'লেন' },
        pcont: { 'আমি': root + 'চ্ছিলাম', 'তুমি': root + 'চ্ছিলে', 'তুই': root + 'চ্ছিলি', 'সে': root + 'চ্ছিল', 'আপনি': root + 'চ্ছিলেন' },
        fut: { 'আমি': root + 'ব', 'তুমি': root + 'বে', 'তুই': root + 'বি', 'সে': root + 'বে', 'আপনি': root + 'বেন' },
        other: [root, stemIye, root + 'তে', root + 'লে']
      };
    }

    // Regular consonant-ending root (e.g., কর, চল, বল, দেখ, শুন, উঠ, উড়, ছুট, পড়, খেল, বুন, নাচ, হাস, ভাস, ডুব, ভালোবাস)
    let base = root;
    if (base.endsWith('ে') && base.length > 2) {
      base = base.slice(0, -1);
    }
    const perfStem = getPerfectStem(base);

    return {
      root: base,
      label: `${base}া (Verb)`,
      pres: { 'আমি': base + 'ি', 'তুমি': base + 'ো', 'তুই': base + 'িস', 'সে': base + 'ে', 'আপনি': base + 'েন' },
      cont: { 'আমি': base + 'ছি', 'তুমি': base + 'ছো', 'তুই': base + 'ছিস', 'সে': base + 'ছে', 'আপনি': base + 'ছেন' },
      perf: { 'আমি': perfStem + 'ছি', 'তুমি': perfStem + 'ছো', 'তুই': perfStem + 'ছিস', 'সে': perfStem + 'ছে', 'আপনি': perfStem + 'ছেন' },
      past: { 'আমি': base + 'লাম', 'তুমি': base + 'লে', 'তুই': base + 'লি', 'সে': base + 'ল', 'আপনি': base + 'লেন' },
      pcont: { 'আমি': base + 'ছিলাম', 'তুমি': base + 'ছিলে', 'তুই': base + 'ছিলি', 'সে': base + 'ছিল', 'আপনি': base + 'ছিলেন' },
      fut: { 'আমি': base + 'ব', 'তুমি': base + 'বে', 'তুই': base + 'বি', 'সে': base + 'বে', 'আপনি': base + 'বেন' },
      other: [base, perfStem, base + 'তে', base + 'লে', base + 'া', base + 'িয়া']
    };
  }

  /**
   * Generates Noun / Pronoun / Adjective inflected forms (বচন ও বিভক্তি)
   */
  function getNounInflections(word) {
    const w = (word || '').trim();
    if (!w) return [];

    // Strip common endings to find a clean noun base if already inflected
    let base = w;
    for (const suf of ['গুলোতে', 'গুলোয়', 'গুলো', 'গুলি', 'দের', 'খানা', 'খানি', 'টাতে', 'টায়', 'টা', 'টিতে', 'টি', 'েতে', 'তে']) {
      if (base.length > suf.length + 1 && base.endsWith(suf)) {
        base = base.slice(0, -suf.length);
        break;
      }
    }

    const forms = [
      { label: 'মূল শব্দ (Base)', word: base, ending: '' },
      { label: 'নির্দেশক (-টি / -টা)', word: joinWordAndEnding(base, 'টি'), ending: 'টি' },
      { label: 'নির্দেশক (-টা)', word: joinWordAndEnding(base, 'টা'), ending: 'টা' },
      { label: 'বহুবচন (-গুলো)', word: joinWordAndEnding(base, 'গুলো'), ending: 'গুলো' },
      { label: 'বহুবচন (-গুলি)', word: joinWordAndEnding(base, 'গুলি'), ending: 'গুলি' },
      { label: 'এ / য় বিভক্তি (Locative)', word: endsWithVowelOrKar(base) ? joinWordAndEnding(base, 'য়') : joinWordAndEnding(base, 'এ'), ending: endsWithVowelOrKar(base) ? 'য়' : 'এ' },
      { label: 'তে বিভক্তি (In/At)', word: joinWordAndEnding(base, 'তে'), ending: 'তে' },
      { label: 'র / এর বিভক্তি (Of/Possessive)', word: joinWordAndEnding(base, 'র'), ending: 'র' },
      { label: 'দের বিভক্তি (Plural Of)', word: joinWordAndEnding(base, 'দের'), ending: 'দের' },
      { label: 'কে বিভক্তি (To/Object)', word: joinWordAndEnding(base, 'কে'), ending: 'কে' },
      { label: 'জোর (-ই)', word: joinWordAndEnding(base, 'ই'), ending: 'ই' },
      { label: 'আরও (-ও)', word: joinWordAndEnding(base, 'ও'), ending: 'ও' }
    ];

    // Deduplicate by word
    const seen = new Set();
    return forms.filter(f => {
      if (seen.has(f.word)) return false;
      seen.add(f.word);
      return true;
    });
  }

  /**
   * Detects the grammatical subject person on a line of words
   * Returns: 'আমি' | 'তুমি' | 'তুই' | 'আপনি' | 'সে' | null
   */
  function detectLineSubject(lineWords) {
    if (!Array.isArray(lineWords)) return null;
    for (const raw of lineWords) {
      const w = (raw || '').trim();
      if (['আমি', 'আমরা', 'মোরা'].includes(w)) return 'আমি';
      if (['তুমি', 'তোমরা'].includes(w)) return 'তুমি';
      if (['তুই', 'তোরা'].includes(w)) return 'তুই';
      if (['আপনি', 'আপনারা', 'তিনি', 'তাঁরা'].includes(w)) return 'আপনি';
      if (['সে', 'তারা', 'ও', 'ওরা', 'এ', 'এরা', 'যে', 'যারা', 'কে', 'কারা'].includes(w)) return 'সে';
    }
    // Check if there is a clear animate/noun subject on the line
    for (const raw of lineWords) {
      const w = (raw || '').trim();
      if (['খোকা', 'খোকন', 'ছেলে', 'মেয়ে', 'পাখি', 'চাঁদ', 'সূর্য', 'বৃষ্টি', 'নদী', 'ট্রেন', 'কুকুর', 'বেড়াল', 'মাছ', 'মৌমাছি', 'পিপীলিকা'].includes(w)) {
        return 'সে';
      }
    }
    return null;
  }

  /**
   * Detects which tense a verb surface word is currently in, and returns the conjugated form for `targetSubject`
   */
  function agreeVerbWithSubject(verbWord, targetSubject) {
    if (!verbWord || !targetSubject) return verbWord;
    const conj = conjugateVerb(verbWord);
    const tenses = ['pres', 'cont', 'perf', 'past', 'pcont', 'fut'];
    for (const t of tenses) {
      const map = conj[t];
      if (map && Object.values(map).includes(verbWord)) {
        return map[targetSubject] || verbWord;
      }
    }
    // Heuristic fallback based on suffix of verbWord
    if (verbWord.endsWith('ছি') || verbWord.endsWith('ছো') || verbWord.endsWith('ছ') || verbWord.endsWith('ছে') || verbWord.endsWith('ছেন')) {
      // Check if perfect stem
      if (verbWord.startsWith(getPerfectStem(conj.root).slice(0, -1))) {
        return conj.perf[targetSubject] || verbWord;
      }
      return conj.cont[targetSubject] || verbWord;
    }
    if (verbWord.endsWith('লাম') || verbWord.endsWith('লেম') || verbWord.endsWith('লে') || verbWord.endsWith('লি') || verbWord.endsWith('ল') || verbWord.endsWith('লো')) {
      return conj.past[targetSubject] || verbWord;
    }
    if (verbWord.endsWith('ব') || verbWord.endsWith('বো') || verbWord.endsWith('বে') || verbWord.endsWith('বি')) {
      return conj.fut[targetSubject] || verbWord;
    }
    return conj.pres[targetSubject] || verbWord;
  }

  /**
   * Rhyme Finder (ছন্দ মেলাও): finds rhyming Bangla words based on phonetic & orthographic endings
   */
  function getRhymeKeys(word) {
    const w = (word || '').trim().replace(/[।,!?"'“”]/g, '');
    const p = transliterate(w);
    // Extract last vowel+consonant+vowel pattern in phonetic string
    const m = p.match(/[aeiou]+[bcdfghjklmnpqrstvwxyz]+[aeiou]*$/i) || p.match(/[aeiou]+[bcdfghjklmnpqrstvwxyz]*[aeiou]*$/i);
    const phonKey = m ? m[0].toLowerCase() : p.slice(-2).toLowerCase();
    const bnTail3 = w.slice(-3);
    const bnTail2 = w.slice(-2);
    const bnTail1 = w.slice(-1);
    return { w, p, phonKey, bnTail3, bnTail2, bnTail1 };
  }

  function findRhymes(targetWord, allWordsList, limit = 36) {
    if (!targetWord) return [];
    const target = getRhymeKeys(targetWord);
    if (!target.w) return [];

    const scored = [];
    const seen = new Set([target.w]);

    for (const item of allWordsList) {
      const candW = typeof item === 'string' ? item : item.w;
      if (!candW || seen.has(candW) || candW.length < 2) continue;
      if (typeof item === 'object' && item.c === 'endings') continue;

      const cand = getRhymeKeys(candW);
      let score = 0;

      // Exact last 3 Bangla chars match (e.g., বেঁধেছে / নেমেছে / দেখেছে -> েছে)
      if (target.w.length >= 3 && candW.length >= 3 && cand.bnTail3 === target.bnTail3) {
        score += 35;
      }
      // Exact last 2 Bangla chars match (e.g., মামা/জামা, টিয়ে/দিয়ে, টুপুর/টাপুর, ভালো/আলো)
      if (target.w.length >= 2 && cand.bnTail2 === target.bnTail2) {
        score += 50;
      }
      // Exact phonetic rhyme tail match (e.g. বান/দান/গান -> 'an', চাঁদ/ফাঁদ -> 'and')
      if (target.phonKey.length >= 2 && cand.phonKey === target.phonKey) {
        score += 45;
      } else if (target.phonKey.length >= 2 && cand.p.endsWith(target.phonKey)) {
        score += 35;
      }
      // Last Bangla char + same length
      if (cand.bnTail1 === target.bnTail1 && KARS[target.bnTail1]) {
        score += 18;
      }

      if (score >= 35) {
        seen.add(candW);
        const popBonus = (typeof item === 'object' && item.pop) ? 10 : 0;
        const lenDiffPenalty = Math.abs(candW.length - target.w.length) * 2;
        scored.push({
          word: candW,
          phonetic: cand.p,
          category: typeof item === 'object' ? item.c : 'general',
          score: score + popBonus - lenDiffPenalty
        });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }

  /**
   * Bangla Audio Pronunciation Engine (Word & Full Poem TTS)
   * Uses native bn-BD / bn-IN SpeechSynthesis when available, with automatic
   * Cloud Bangla TTS Audio fallback + Phonetic SpeechSynthesis backup.
   */
  let activeAudio = null;
  let stopRequested = false;
  let cachedVoices = [];

  function loadVoices() {
    if ('speechSynthesis' in window) {
      cachedVoices = window.speechSynthesis.getVoices() || [];
    }
    return cachedVoices;
  }

  if ('speechSynthesis' in window) {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      loadVoices();
    };
  }

  function getBanglaVoice() {
    const voices = loadVoices();
    // Prefer natural/neural bn-BD or bn-IN voices
    const bnVoices = voices.filter(v =>
      v.lang && (v.lang.toLowerCase().startsWith('bn') || v.name.toLowerCase().includes('bengali') || v.name.toLowerCase().includes('bangla'))
    );
    if (bnVoices.length > 0) {
      const natural = bnVoices.find(v => v.name.includes('Natural') || v.name.includes('Online') || v.lang.toLowerCase().includes('bd'));
      return natural || bnVoices[0];
    }
    return null;
  }

  function getHindiOrIndicVoice() {
    const voices = loadVoices();
    return voices.find(v => v.lang && (v.lang.toLowerCase().startsWith('hi') || v.lang.toLowerCase().startsWith('as') || v.lang.toLowerCase().startsWith('or'))) || null;
  }

  function stopSpeaking() {
    stopRequested = true;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (activeAudio) {
      try {
        activeAudio.pause();
        activeAudio.currentTime = 0;
      } catch (e) {}
      activeAudio = null;
    }
  }

  /**
   * Speaks a single Bangla text string (word or line) and returns a Promise that resolves when done
   */
  function speakSegment(text, options = {}) {
    const cleanText = (text || '').trim();
    if (!cleanText) return Promise.resolve();
    const rate = options.rate || 0.92;

    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };

      const bnVoice = getBanglaVoice();

      // Strategy 1: Native Bangla SpeechSynthesis Voice (e.g. Edge/Chrome/Android/Mac bn-BD or bn-IN)
      if (bnVoice && !options.forceCloud) {
        try {
          window.speechSynthesis.cancel();
          const utter = new SpeechSynthesisUtterance(cleanText);
          utter.voice = bnVoice;
          utter.lang = bnVoice.lang || 'bn-BD';
          utter.rate = rate;
          utter.pitch = 1.05;
          const timer = setTimeout(finish, Math.max(4000, cleanText.length * 300));
          utter.onend = () => { clearTimeout(timer); finish(); };
          utter.onerror = () => {
            clearTimeout(timer);
            tryCloudOrFallback(cleanText, rate, finish);
          };
          window.speechSynthesis.speak(utter);
          return;
        } catch (err) {
          // Fall through to Cloud TTS
        }
      }

      tryCloudOrFallback(cleanText, rate, finish);
    });
  }

  function tryCloudOrFallback(cleanText, rate, finish) {
    // Strategy 2: Google Translate Bangla TTS stream via no-referrer Audio element
    try {
      const encoded = encodeURIComponent(cleanText);
      const url = `https://translate.googleapis.com/translate_tts?ie=UTF-8&tl=bn&client=tw-ob&q=${encoded}`;
      const audio = new Audio();
      audio.referrerPolicy = 'no-referrer';
      audio.playbackRate = Math.min(Math.max(rate, 0.65), 1.25);
      activeAudio = audio;

      const timeout = setTimeout(() => {
        speakPhoneticFallback(cleanText, rate, finish);
      }, 3500);

      audio.oncanplaythrough = () => {
        clearTimeout(timeout);
      };
      audio.onended = () => {
        clearTimeout(timeout);
        activeAudio = null;
        finish();
      };
      audio.onerror = () => {
        clearTimeout(timeout);
        activeAudio = null;
        speakPhoneticFallback(cleanText, rate, finish);
      };

      audio.src = url;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          clearTimeout(timeout);
          activeAudio = null;
          speakPhoneticFallback(cleanText, rate, finish);
        });
      }
    } catch (e) {
      speakPhoneticFallback(cleanText, rate, finish);
    }
  }

  function speakPhoneticFallback(cleanText, rate, finish) {
    if (!('speechSynthesis' in window)) {
      finish();
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const indicVoice = getHindiOrIndicVoice();
      if (indicVoice) {
        // Indic voices can often read phonetic or Devanagari-mapped text, or we pass phonetic words
        const phoneticText = cleanText.split(/\s+/).map(w => transliterate(w)).join(' ');
        const utter = new SpeechSynthesisUtterance(phoneticText);
        utter.voice = indicVoice;
        utter.rate = rate * 0.9;
        utter.onend = finish;
        utter.onerror = finish;
        window.speechSynthesis.speak(utter);
        return;
      }
      // English phonetic reading as last-resort offline fallback so kids always hear the pronunciation
      const phoneticText = cleanText.split(/\s+/).map(w => transliterate(w)).join(' ');
      const utter = new SpeechSynthesisUtterance(phoneticText);
      utter.lang = 'en-US';
      utter.rate = rate * 0.85;
      utter.pitch = 1.05;
      const timer = setTimeout(finish, Math.max(3000, phoneticText.length * 250));
      utter.onend = () => { clearTimeout(timer); finish(); };
      utter.onerror = () => { clearTimeout(timer); finish(); };
      window.speechSynthesis.speak(utter);
    } catch (e) {
      finish();
    }
  }

  /**
   * Speaks a single word immediately
   */
  async function speakWord(word, options = {}) {
    stopSpeaking();
    stopRequested = false;
    await speakSegment(word, options);
  }

  /**
   * Speaks an array of poem lines sequentially, invoking `onLineStart(lineIdx, lineObj)` and `onDone()`
   */
  async function speakPoemLines(lines, callbacks = {}) {
    stopSpeaking();
    stopRequested = false;
    const rate = callbacks.rate || 0.9;

    for (let i = 0; i < lines.length; i++) {
      if (stopRequested) break;
      const line = lines[i];
      if (callbacks.onLineStart) callbacks.onLineStart(i, line);
      await speakSegment(line.text, { rate });
      if (stopRequested) break;
      // Brief poetic pause between lines
      await new Promise(r => setTimeout(r, 220));
    }

    if (callbacks.onDone) callbacks.onDone();
  }

  window.BanglaEngine = {
    transliterate,
    joinWordAndEnding,
    conjugateVerb,
    getNounInflections,
    detectLineSubject,
    agreeVerbWithSubject,
    findRhymes,
    speakWord,
    speakPoemLines,
    stopSpeaking,
    getBanglaVoice,
    SURFACE_TO_VERB_ROOT,
    IRREGULAR_VERBS
  };
})();
