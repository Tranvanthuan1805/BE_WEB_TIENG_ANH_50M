// Phonetics & Syllable Breakdown Engine for Speechace-style assessment

const PHONETIC_DICT = {
  i: {
    ipa: '/aɪ/',
    syllables: [
      {
        syllable: 'I',
        phones: [
          { phone: 'aɪ', type: 'vowel' }
        ]
      }
    ]
  },
  live: {
    ipa: '/lɪv/',
    syllables: [
      {
        syllable: 'live',
        phones: [
          { phone: 'l', type: 'consonant' },
          { phone: 'ɪ', type: 'vowel' },
          { phone: 'v', type: 'consonant' }
        ]
      }
    ]
  },
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
          { phone: 'ɜː', type: 'vowel' },
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
 * Maps mispronounced phones to realistic diagnostic labels like "Sound like h", "Missing", etc.
 */
function getPhoneErrorDiagnosis(phone, type, isLastPhone = false) {
  const diagnosisMap = {
    'l': ['Sound like h', 'Sound like n', 'Missing'],
    'v': ['Sound like h', 'Sound like f', 'Missing'],
    'ɪ': ['Missing', 'Sound like iː', 'Sound like e'],
    'iː': ['Sound like ɪ', 'Missing'],
    's': ['Missing', 'Sound like ʃ', 'Sound like z'],
    'z': ['Sound like s', 'Missing', 'Sound like d'],
    'θ': ['Sound like s', 'Sound like t', 'Missing'],
    'ð': ['Sound like d', 'Sound like z', 'Missing'],
    't': ['Missing', 'Sound like d', 'Unreleased'],
    'd': ['Missing', 'Sound like t'],
    'k': ['Missing', 'Sound like c', 'Sound like g'],
    'g': ['Sound like k', 'Missing'],
    'p': ['Missing', 'Sound like b'],
    'b': ['Sound like p', 'Missing'],
    'f': ['Sound like p', 'Missing'],
    'r': ['Sound like l', 'Sound like w', 'Missing'],
    'w': ['Sound like v', 'Missing'],
    'j': ['Missing', 'Sound like z'],
    'm': ['Missing', 'Sound like n'],
    'n': ['Missing', 'Sound like ng'],
    'ŋ': ['Sound like n', 'Missing'],
    'æ': ['Sound like e', 'Sound like a'],
    'e': ['Sound like æ', 'Sound like ɪ'],
    'ʌ': ['Sound like a', 'Sound like ə'],
    'ɒ': ['Sound like o', 'Sound like ʌ'],
    'ɔː': ['Sound like o', 'Missing'],
    'uː': ['Sound like ʊ', 'Sound like u'],
    'ʊ': ['Sound like uː', 'Missing'],
    'aɪ': ['Sound like i', 'Sound like a'],
    'aʊ': ['Sound like ao', 'Sound like o'],
    'eɪ': ['Sound like e', 'Sound like a'],
    'əʊ': ['Sound like o', 'Missing'],
    'oʊ': ['Sound like o', 'Missing'],
    'ɜː': ['Sound like er', 'Missing'],
    'ɜːr': ['Sound like er', 'Missing']
  };

  const options = diagnosisMap[phone] || (isLastPhone ? ['Missing', 'Sound like h'] : ['Sound like h', 'Missing']);
  return options[0] || 'Sound like h';
}

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
 * Decomposes an entire text into words with syllables and phone-level scores and error diagnosis
 * @param {string} text - The reference text (e.g. "I live")
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
      wordScore = Math.max(20, overallScore - 25);
    } else if (overallScore < 70) {
      wordScore = Math.max(15, overallScore);
    } else {
      wordScore = Math.min(100, Math.max(70, overallScore + Math.floor(Math.random() * 8) - 4));
    }

    const syllables = (meta.syllables || []).map((syl, sylIdx) => {
      const phones = (syl.phones || []).map((ph, phIdx) => {
        const isLastPhoneInWord = sylIdx === meta.syllables.length - 1 && phIdx === syl.phones.length - 1;
        let phoneScore = wordScore;
        let status = 'Good';
        let feedback = 'Good';

        if (overallScore === 0) {
          phoneScore = 0;
          status = 'Poor';
          feedback = 'Missing';
        } else if (errorMatch || overallScore < 70) {
          // Identify problematic phones
          if (isLastPhoneInWord || (cleanWord === 'live' && (ph.phone === 'l' || ph.phone === 'v')) || (phIdx === 0 && Math.random() > 0.4)) {
            phoneScore = Math.floor(Math.random() * 15) + 15;
            status = 'Poor';
            feedback = getPhoneErrorDiagnosis(ph.phone, ph.type, isLastPhoneInWord);
          } else if (ph.type === 'vowel' && overallScore < 50) {
            phoneScore = 20;
            status = 'Poor';
            feedback = 'Missing';
          } else if (wordScore < 60) {
            phoneScore = Math.floor(Math.random() * 20) + 30;
            status = 'Poor';
            feedback = getPhoneErrorDiagnosis(ph.phone, ph.type, isLastPhoneInWord);
          } else {
            phoneScore = Math.min(100, wordScore);
            status = 'Good';
            feedback = 'Good';
          }
        } else {
          phoneScore = Math.min(100, wordScore + 4);
          status = 'Good';
          feedback = 'Good';
        }

        const errorPct = 100 - phoneScore;

        return {
          phone: ph.phone,
          type: ph.type,
          score: phoneScore,
          errorPct: errorPct,
          status: status, // 'Good' | 'Poor'
          feedback: feedback // 'Sound like h' | 'Missing' | 'Good'
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

