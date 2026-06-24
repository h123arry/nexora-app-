import { User } from '../../types';

export class ProfileEngine {
  static getProfileAudit(user: User): string {
    const isBioEmpty = !user.bio || user.bio.trim() === '';
    const hasWebsite = !!user.website;
    const hasSkills = user.skills && user.skills.length > 0;

    return `### 👤 VOH AI Profile Audit
Reviewing profile credentials for **@${user.username}**:
- **Bio Quality**: ${isBioEmpty ? '❌ Empty (Recommended: add a high-impact branding statement)' : '✅ Verified'}
- **External Portfolio**: ${hasWebsite ? '✅ Verified link linked' : '⚠️ Missing external website (Recommended: link your github/behance)'}
- **Developer Skills**: ${hasSkills ? `✅ Verified ${user.skills.length} skills` : '❌ No skills added (Recommended: list your specialty tools to verify reputation)'}

#### 💡 Suggested Bio Options
1. **Futuristic Option**: *"Pioneering modular design tokens and zero-cost compiler frameworks on Nexora. Let's co-build future human interfaces! 🚀"*
2. **Community Builder Option**: *"Digital craftsman co-building verified knowledge networks in Port Harcourt. High-reputation creator and UI/UX strategist. 🎨"*`;
  }
}
