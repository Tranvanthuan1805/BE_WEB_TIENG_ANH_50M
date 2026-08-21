// Phonetics & Syllable Breakdown Engine for Speechace-style assessment

const PHONETIC_DICT = {
  you: {
    ipa: '/juː/',
    syllables: [
      {
        syllable: 'you',
        phones: [
          { phone: 'j', type: 'consonant' },
          { phone: 'uː', type: 'vowel' }
        ]
      }
    ]
  },
  work: {
    ipa: '/wɜːk/',
    syllables: [
      {
        syllable: 'work',
        phones: [
          { phone: 'w', type: 'consonant' },
          { phone: 'ə', type: 'vowel' },
          { phone: 'k', type: 'consonant' }
        ]
      }
    ]
  },
  come: {
    ipa: '/kʌm/',
    syllables: [
      {
        syllable: 'come',
        phones: [
          { phone: 'k', type: 'consonant' },
          { phone: 'ʌ', type: 'vowel' },
          { phone: 'm', type: 'consonant' }
        ]
      }
    ]
  },
  in: {
    ipa: '/ɪn/',
    syllables: [
      {
        syllable: 'in',
        phones: [
          { phone: 'ɪ', type: 'vowel' },
          { phone: 'n', type: 'consonant' }
        ]
      }
    ]
  },
  stand: {
    ipa: '/stænd/',
    syllables: [
      {
        syllable: 'stand',
        phones: [
          { phone: 's', type: 'consonant' },
          { phone: 't', type: 'consonant' },
          { phone: 'æ', type: 'vowel' },
          { phone: 'n', type: 'consonant' },
          { phone: 'd', type: 'consonant' }
        ]
      }
    ]
  },
  up: {
    ipa: '/ʌp/',
    syllables: [
      {
        syllable: 'up',
        phones: [
          { phone: 'ʌ', type: 'vowel' },
          { phone: 'p', type: 'consonant' }
        ]
      }
    ]
  },
  sit: {
    ipa: '/sɪt/',
    syllables: [
      {
        syllable: 'sit',
        phones: [
          { phone: 's', type: 'consonant' },
          { phone: 'ɪ', type: 'vowel' },
          { phone: 't', type: 'consonant' }
        ]
      }
    ]
  },
  down: {
    ipa: '/daʊn/',
    syllables: [
      {
        syllable: 'down',
        phones: [
          { phone: 'd', type: 'consonant' },
          { phone: 'aʊ', type: 'vowel' },
          { phone: 'n', type: 'consonant' }
        ]
      }
    ]
  },
  take: {
    ipa: '/teɪk/',
    syllables: [
      {
        syllable: 'take',
        phones: [
          { phone: 't', type: 'consonant' },
          { phone: 'eɪ', type: 'vowel' },
          { phone: 'k', type: 'consonant' }
        ]
      }
    ]
  },
  out: {
    ipa: '/aʊt/',
    syllables: [
      {
        syllable: 'out',
        phones: [
          { phone: 'aʊ', type: 'vowel' },
          { phone: 't', type: 'consonant' }
        ]
      }
    ]
  },
  write: {
    ipa: '/raɪt/',
    syllables: [
      {
        syllable: 'write',
        phones: [
          { phone: 'r', type: 'consonant' },
          { phone: 'aɪ', type: 'vowel' },
          { phone: 't', type: 'consonant' }
        ]
      }
    ]
  },
  pick: {
    ipa: '/pɪk/',
    syllables: [
      {
        syllable: 'pick',
        phones: [
          { phone: 'p', type: 'consonant' },
          { phone: 'ɪ', type: 'vowel' },
          { phone: 'k', type: 'consonant' }
        ]
      }
    ]
  },
  make: {
    ipa: '/meɪk/',
    syllables: [
      {
        syllable: 'make',
        phones: [
          { phone: 'm', type: 'consonant' },
          { phone: 'eɪ', type: 'vowel' },
          { phone: 'k', type: 'consonant' }
        ]
      }
    ]
  },
  student: {
    ipa: '/ˈstjuːdənt/',
    syllables: [
      {
        syllable: 'stu',
        phones: [
          { phone: 's', type: 'consonant' },
          { phone: 't', type: 'consonant' },
          { phone: 'juː', type: 'vowel' }
        ]
      },
      {
        syllable: 'dent',
        phones: [
          { phone: 'd', type: 'consonant' },
          { phone: 'ə', type: 'vowel' },
          { phone: 'n', type: 'consonant' },
          { phone: 't', type: 'consonant' }
        ]
      }
    ]
  },
  classroom: {
    ipa: '/ˈklɑːsruːm/',
    syllables: [
      {
        syllable: 'class',
        phones: [
          { phone: 'k', type: 'consonant' },
          { phone: 'l', type: 'consonant' },
          { phone: 'æ', type: 'vowel' },
          { phone: 's', type: 'consonant' }
        ]
      },
      {
        syllable: 'room',
        phones: [
          { phone: 'r', type: 'consonant' },
          { phone: 'uː', type: 'vowel' },
          { phone: 'm', type: 'consonant' }
        ]
      }
    ]
  },
  school: {
    ipa: '/skuːl/',
    syllables: [
      {
        syllable: 'school',
        phones: [
          { phone: 's', type: 'consonant' },
          { phone: 'k', type: 'consonant' },
          { phone: 'uː', type: 'vowel' },
          { phone: 'l', type: 'consonant' }
        ]
      }
    ]
  },
  bicycle: {
    ipa: '/ˈbaɪsɪkl/',
    syllables: [
      {
        syllable: 'bi',
        phones: [
          { phone: 'b', type: 'consonant' },
          { phone: 'aɪ', type: 'vowel' }
        ]
      },
      {
        syllable: 'cy',
        phones: [
          { phone: 's', type: 'consonant' },
          { phone: 'ɪ', type: 'vowel' }
        ]
      },
      {
        syllable: 'cle',
        phones: [
          { phone: 'k', type: 'consonant' },
          { phone: 'l', type: 'consonant' }
        ]
      }
    ]
  },
  banana: {
    ipa: '/bəˈnænə/',
    syllables: [
      {
        syllable: 'ba',
        phones: [{ phone: 'b', type: 'consonant' }, { phone: 'ə', type: 'vowel' }]
      },
      {
        syllable: 'na',
        phones: [{ phone: 'n', type: 'consonant' }, { phone: 'æ', type: 'vowel' }]
      },
      {
        syllable: 'na',
        phones: [{ phone: 'n', type: 'consonant' }, { phone: 'ə', type: 'vowel' }]
      }
    ]
  }
};

/**
 * Fallback phonetic generator for any English word not in explicit dictionary
 */
function generateDynamicPhonetics(word) {
  const clean = String(word || '').toLowerCase().trim().replace(/[^a-z]/g, '');
  if (!clean) return { ipa: '/.../', syllables: [] };

  if (PHONETIC_DICT[clean]) {
    return JSON.parse(JSON.stringify(PHONETIC_DICT[clean]));
  }

  // Basic vowel/consonant character parsing
  const vowels = ['a', 'e', 'i', 'o', 'u', 'y'];
  const phones = [];

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const isVowel = vowels.includes(char);
    let phoneSymbol = char;
    if (char === 'a') phoneSymbol = 'æ';
    else if (char === 'e') phoneSymbol = 'e';
    else if (char === 'i') phoneSymbol = 'ɪ';
    else if (char === 'o') phoneSymbol = 'ɒ';
    else if (char === 'u') phoneSymbol = 'ʌ';
    else if (char === 'y') phoneSymbol = 'aɪ';

    phones.push({
      phone: phoneSymbol,
      type: isVowel ? 'vowel' : 'consonant'
    });
  }

  return {
    ipa: `/${clean}/`,
    syllables: [
      {
        syllable: clean,
        phones: phones
      }
    ]
  };
}

/**
 * Decomposes an entire text into words with syllables and phone-level scores
 * @param {string} text - The reference text (e.g. "You work")
 * @param {number} overallScore - 0 to 100
 * @param {Array} errors - Errors detected by AI
 */
function breakdownSentenceToPhones(text, overallScore = 90, errors = []) {
  const rawWords = String(text || '').trim().split(/\s+/).filter(Boolean);
  
  const wordsBreakdown = rawWords.map((rawWord) => {
    const cleanWord = rawWord.toLowerCase().replace(/[^a-z]/g, '');
    const meta = generateDynamicPhonetics(cleanWord);

    // Check if word has specific errors
    const errorMatch = errors.find(e => 
      e.word && cleanWord.includes(String(e.word).toLowerCase())
    );

    let wordScore = overallScore;
    if (errorMatch) {
      wordScore = Math.max(40, overallScore - 25);
    } else {
      wordScore = Math.min(100, Math.max(70, overallScore + Math.floor(Math.random() * 8) - 4));
    }

    const syllables = (meta.syllables || []).map((syl, sylIdx) => {
      const phones = (syl.phones || []).map((ph, phIdx) => {
        let phoneScore = wordScore;
        let status = 'Good';

        // If error exists, identify wrong phone (often final consonant or vowels)
        if (errorMatch && (phIdx === syl.phones.length - 1 || ph.type === 'vowel')) {
          phoneScore = Math.floor(Math.random() * 16) + 40; // 40-55
          status = 'Poor';
        } else if (overallScore < 70 && phIdx === syl.phones.length - 1) {
          // Vietnamese common final consonant drop
          phoneScore = Math.floor(Math.random() * 15) + 45;
          status = 'Poor';
        } else if (phoneScore >= 75) {
          status = 'Good';
        } else if (phoneScore >= 60) {
          status = 'Good';
        } else {
          status = 'Poor';
        }

        const errorPct = 100 - phoneScore;

        return {
          phone: ph.phone,
          type: ph.type,
          score: phoneScore,
          errorPct: errorPct,
          status: status // 'Good' | 'Poor'
        };
      });

      return {
        syllable: syl.syllable,
        phones
      };
    });

    return {
      word: rawWord,
      cleanWord,
      ipa: meta.ipa,
      score: wordScore,
      status: wordScore >= 75 ? 'Good' : 'Poor',
      syllables
    };
  });

  return wordsBreakdown;
}

module.exports = {
  PHONETIC_DICT,
  generateDynamicPhonetics,
  breakdownSentenceToPhones
};
