from pathlib import Path

FILE = Path("src/components/AuthView.tsx")
text = FILE.read_text(encoding="utf-8")

if "const MAX_FAILED_ATTEMPTS" not in text:
    helpers = r'''

const MAX_FAILED_ATTEMPTS = 5;

const INTEREST_TOPICS = [
  "Technology","Music","Gaming","Sports","News",
  "Business","AI","Science","Movies","Photography",
  "Travel","Fashion","Food","Health","Education",
  "Programming","Finance","Nature","Art","Books"
];

type RegisteredAccount = {
  email: string;
  passwordHash: string;
  user: User;
};

function loadAccounts(): RegisteredAccount[] {
  try {
    return JSON.parse(localStorage.getItem("nexora_registered_accounts") || "[]");
  } catch {
    return [];
  }
}

function saveAccounts(accounts: RegisteredAccount[]) {
  localStorage.setItem(
    "nexora_registered_accounts",
    JSON.stringify(accounts)
  );
}

function getRichUser(user: User): User {
  return {
    followers: 0,
    following: 0,
    sparks: 0,
    reputationPoints: 0,
    reputationBreakdown: {
      contributions: 0,
      helpfulness: 0,
      missionsCompleted: 0,
      skillsVerified: 0
    },
    interestDNA: {},
    skills: [],
    bio: "",
    location: "",
    website: "",
    avatar: "",
    coverImage: "",
    isVerified: false,
    joinedDate: new Date().toLocaleDateString("en-US",{month:"long",year:"numeric"}),
    ...user
  };
}

'''

    text = text.replace(
        "export default function AuthView",
        helpers + "\nexport default function AuthView",
        1,
    )

text = text.replace(
    "localStorage.setItem('nexora_registered_accounts', JSON.stringify(updated));",
    "saveAccounts(updated);"
)

text = text.replace(
    'localStorage.setItem("nexora_registered_accounts", JSON.stringify(updated));',
    "saveAccounts(updated);"
)

FILE.write_text(text, encoding="utf-8")
print("✅ AuthView patched successfully.")
