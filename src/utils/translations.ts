export type Locale = 'en' | 'fr' | 'ar' | 'pt';

export interface TranslationSet {
  brandDescription: string;
  homeFeed: string;
  worldPulse: string;
  vohAi: string;
  activityLabel: string;
  myProfile: string;
  searchPlaceholder: string;
  quickActions: string;
  currentPulse: string;
  createPost: string;
  premiumFootnote: string;
  adminPanel: string;
  watchSession: string;
  forgotPassword: string;
  onboardingTitle: string;
  preferredLanguage: string;
  topicsLike: string;
  communitiesWanted: string;
  nextStep: string;
  finishOnboarding: string;
  reportsHeader: string;
  reportAction: string;
  blockAction: string;
  hideAction: string;
  notInterested: string;
  saveCollection: string;
  savedCollectionsTitle: string;
  backupExport: string;
  backupDownload: string;
  appHealthTitle: string;
  errorLogger: string;
  registeredAdmins: string;
  recoveryEmailLabel: string;
  recoveryPhoneLabel: string;
  deviceVerificationLabel: string;
  getAccessKey: string;
  successMessage: string;
  navHome: string;
  navExplore: string;
  navCommunities: string;
  navMessages: string;
  navActivity: string;
  navProfile: string;
  navNavigate: string;
  navCreateDiscover: string;
  navCreate: string;
  navShareMoment: string;
  navCreatorStudio: string;
  navGrowSignal: string;
  navSystemHub: string;
  navSettingsAccessibility: string;
  navProfileSettings: string;
  navVisitorPreview: string;
  navSignInToPersonalize: string;
  navPrimaryNavigation: string;
  navPrivateByDesign: string;
  navPremiumByDefault: string;
  navDailySignal: string;
  navFindPeople: string;
  navSharedInterests: string;
  navPrivateConversations: string;
  navStayInLoop: string;
  navYourSpace: string;
  filterAll: string;
  filterUsers: string;
  filterPosts: string;
  filterVideos: string;
  filterCommunities: string;
  inboxTitle: string; inboxChats: string; inboxRequests: string; inboxArchived: string; inboxSearchPlaceholder: string; inboxNewMessage: string; inboxCreateGroup: string; inboxCreateGroupHeading: string; inboxGroupIntro: string; inboxGroupName: string; inboxGroupDescription: string; inboxInviteMembers: string; inboxSelectAtLeastTwo: string; inboxSearchPeople: string; inboxNoAccounts: string; inboxCancel: string; inboxCreating: string; inboxCreateGroupButton: string; inboxGroupCreatedNotice: string; inboxNoMatchingConversations: string; inboxNoMessageRequests: string; inboxNoArchivedConversations: string; inboxNoConversations: string; inboxStartConversationHint: string; inboxStartNewMessage: string; inboxTyping: string; inboxActiveNow: string; inboxOffline: string; inboxBack: string; inboxTryDifferent: string; inboxNewRequestsHint: string; inboxArchivedHint: string;
}

export const TRANSLATIONS: Record<Locale, TranslationSet> = {
  en: {
    brandDescription: "Discover people. Build communities. Shape what's happening.",
    homeFeed: "Home Feed",
    worldPulse: "World Pulse",
    vohAi: "VOH AI Assistant",
    activityLabel: "Activity Feed",
    myProfile: "My Profile",
    searchPlaceholder: "Search NEXORA...",
    quickActions: "Quick Actions",
    currentPulse: "Current Pulse",
    createPost: "➕ Create Post",
    premiumFootnote: "NEXORA Network • Premium",
    adminPanel: "🛡️ Admin Dashboard",
    watchSession: "👁️ Watch Session",
    forgotPassword: "Forgot Password?",
    onboardingTitle: "NEXORA Alignment Protocol",
    preferredLanguage: "Preferred Language",
    topicsLike: "Topics You Like",
    communitiesWanted: "Communities You Want",
    nextStep: "Generate Alignments",
    finishOnboarding: "Activate Account",
    reportsHeader: "System Moderation",
    reportAction: "Report Post",
    blockAction: "Block User",
    hideAction: "Hide Post",
    notInterested: "Not Interested",
    saveCollection: "Save to Collection",
    savedCollectionsTitle: "Saved Collections",
    backupExport: "Data Backup & Privacy",
    backupDownload: "Download App Data Archive",
    appHealthTitle: "Developer App Health Logging",
    errorLogger: "Crash & Speed Logs",
    registeredAdmins: "Registered Founders & Admins",
    recoveryEmailLabel: "Enter your registered Email",
    recoveryPhoneLabel: "Enter phone number (SMS token)",
    deviceVerificationLabel: "Verify via logged device fingerprint",
    getAccessKey: "Recover Access Key",
    successMessage: "Operation verified and logged successfully",
    navHome: "Home",
    navExplore: "Explore",
    navCommunities: "Communities",
    navMessages: "Messages",
    navActivity: "Activity",
    navProfile: "Profile",
    navNavigate: "Navigate",
    navCreateDiscover: "Create & discover",
    navCreate: "Create",
    navShareMoment: "Share a moment",
    navCreatorStudio: "Creator Studio",
    navGrowSignal: "Grow your signal",
    navSystemHub: "System Hub",
    navSettingsAccessibility: "Settings & accessibility",
    navProfileSettings: "Profile settings",
    navVisitorPreview: "Visitor preview. Sample content may appear; sign in for real account actions.",
    navSignInToPersonalize: "Sign in to personalize",
    navPrimaryNavigation: "Primary navigation",
    navPrivateByDesign: "Private by design",
    navPremiumByDefault: "Premium by default",
    navDailySignal: "Your daily signal",
    navFindPeople: "Find your people",
    navSharedInterests: "Shared interests",
    navPrivateConversations: "Private conversations",
    navStayInLoop: "Stay in the loop",
    navYourSpace: "Your space",
    filterAll: "All Results",
    filterUsers: "Users",
    filterPosts: "Posts",
    filterVideos: "Videos",
    filterCommunities: "Communities",
    inboxTitle: "Inbox",
    inboxChats: "Chats",
    inboxRequests: "Requests",
    inboxArchived: "Archived",
    inboxSearchPlaceholder: "Search conversations...",
    inboxNewMessage: "New message",
    inboxCreateGroup: "Create group",
    inboxCreateGroupHeading: "Create a group conversation",
    inboxGroupIntro: "Invite real NEXORA accounts to a shared inbox.",
    inboxGroupName: "Group name",
    inboxGroupDescription: "Description (optional)",
    inboxInviteMembers: "Invite members",
    inboxSelectAtLeastTwo: "Select at least 2",
    inboxSearchPeople: "Search people...",
    inboxNoAccounts: "No matching accounts found.",
    inboxCancel: "Cancel",
    inboxCreating: "Creating…",
    inboxCreateGroupButton: "Create group",
    inboxGroupCreatedNotice: "Group conversation created. Members have been notified.",
    inboxNoMatchingConversations: "No matching conversations",
    inboxNoMessageRequests: "No message requests",
    inboxNoArchivedConversations: "No archived conversations",
    inboxNoConversations: "No conversations yet",
    inboxStartConversationHint: "Choose a creator or contact to start a conversation.",
    inboxStartNewMessage: "New message",
    inboxTyping: "typing...",
    inboxActiveNow: "Active now",
    inboxOffline: "Offline",
    inboxBack: "Back to conversations",
    inboxTryDifferent: "Try a different name or message.",
    inboxNewRequestsHint: "New requests will appear here.",
    inboxArchivedHint: "Conversations you archive will appear here."
  },
  fr: {
    brandDescription: "Découvrez des gens. Créez des communautés. Façonnez l'avenir.",
    homeFeed: "Fil d'actualité",
    worldPulse: "Pulse Mondial",
    vohAi: "Assistant IA VOH",
    activityLabel: "Notifications",
    myProfile: "Mon Profil",
    searchPlaceholder: "Rechercher sur NEXORA...",
    quickActions: "Actions Rapides",
    currentPulse: "Vibrations Actuelles",
    createPost: "➕ Créer un Post",
    premiumFootnote: "Réseau NEXORA • Premium",
    adminPanel: "🛡️ Panneau d'Administration",
    watchSession: "👁️ Boucles Visionnées",
    forgotPassword: "Code d'accès oublié?",
    onboardingTitle: "Protocole d'Alignement NEXORA",
    preferredLanguage: "Langue Préférée",
    topicsLike: "Sujets que vous aimez",
    communitiesWanted: "Communautés souhaitées",
    nextStep: "Générer les Alignements",
    finishOnboarding: "Activer le Compte",
    reportsHeader: "Modération du Système",
    reportAction: "Signaler le Post",
    blockAction: "Bloquer l'utilisateur",
    hideAction: "Masquer le Post",
    notInterested: "Pas intéressé",
    saveCollection: "Enregistrer dans la Collection",
    savedCollectionsTitle: "Collections Enregistrées",
    backupExport: "Sauvegarde & Données Privées",
    backupDownload: "Télécharger l'Archive des Données",
    appHealthTitle: "Journal de Santé de l'Application",
    errorLogger: "Journal des pannes",
    registeredAdmins: "Fondateurs et administrateurs",
    recoveryEmailLabel: "Entrez votre adresse email enregistrée",
    recoveryPhoneLabel: "Entrez le numéro de téléphone (code SMS)",
    deviceVerificationLabel: "Vérifier via l'empreinte de l'appareil",
    getAccessKey: "Récupérer la clé d'accès",
    successMessage: "Opération vérifiée et enregistrée avec succès",
    navHome: "Accueil",
    navExplore: "Explorer",
    navCommunities: "Communautés",
    navMessages: "Messages",
    navActivity: "Activité",
    navProfile: "Profil",
    navNavigate: "Navigation",
    navCreateDiscover: "Créer et découvrir",
    navCreate: "Créer",
    navShareMoment: "Partager un moment",
    navCreatorStudio: "Studio créateur",
    navGrowSignal: "Développez votre audience",
    navSystemHub: "Centre système",
    navSettingsAccessibility: "Paramètres et accessibilité",
    navProfileSettings: "Paramètres du profil",
    navVisitorPreview: "Aperçu visiteur. Du contenu d’exemple peut apparaître ; connectez-vous pour les actions du compte.",
    navSignInToPersonalize: "Se connecter pour personnaliser",
    navPrimaryNavigation: "Navigation principale",
    navPrivateByDesign: "Conçu pour la confidentialité",
    navPremiumByDefault: "Premium par défaut",
    navDailySignal: "Votre signal quotidien",
    navFindPeople: "Trouvez votre communauté",
    navSharedInterests: "Intérêts partagés",
    navPrivateConversations: "Conversations privées",
    navStayInLoop: "Restez informé",
    navYourSpace: "Votre espace",
    filterAll: "Tous les résultats",
    filterUsers: "Personnes",
    filterPosts: "Publications",
    filterVideos: "Vidéos",
    filterCommunities: "Communautés",
    inboxTitle: "Boîte de réception",
    inboxChats: "Discussions",
    inboxRequests: "Demandes",
    inboxArchived: "Archivées",
    inboxSearchPlaceholder: "Rechercher des conversations…",
    inboxNewMessage: "Nouveau message",
    inboxCreateGroup: "Créer un groupe",
    inboxCreateGroupHeading: "Créer une conversation de groupe",
    inboxGroupIntro: "Invitez de vrais comptes NEXORA dans une conversation partagée.",
    inboxGroupName: "Nom du groupe",
    inboxGroupDescription: "Description (facultative)",
    inboxInviteMembers: "Inviter des membres",
    inboxSelectAtLeastTwo: "Sélectionnez au moins 2 personnes",
    inboxSearchPeople: "Rechercher des personnes…",
    inboxNoAccounts: "Aucun compte correspondant.",
    inboxCancel: "Annuler",
    inboxCreating: "Création…",
    inboxCreateGroupButton: "Créer le groupe",
    inboxGroupCreatedNotice: "Conversation de groupe créée. Les membres ont été informés.",
    inboxNoMatchingConversations: "Aucune conversation correspondante",
    inboxNoMessageRequests: "Aucune demande de message",
    inboxNoArchivedConversations: "Aucune conversation archivée",
    inboxNoConversations: "Aucune conversation pour le moment",
    inboxStartConversationHint: "Choisissez un créateur ou un contact pour commencer.",
    inboxStartNewMessage: "Nouveau message",
    inboxTyping: "écrit…",
    inboxActiveNow: "Actif maintenant",
    inboxOffline: "Hors ligne",
    inboxBack: "Retour aux conversations",
    inboxTryDifferent: "Essayez un autre nom ou message.",
    inboxNewRequestsHint: "Les nouvelles demandes apparaîtront ici.",
    inboxArchivedHint: "Les conversations archivées apparaîtront ici."
  },
  ar: {
    brandDescription: "اكتشف الأشخاص. ابنِ المجتمعات. شكّل ملامح ما يحدث.",
    homeFeed: "الخلاصة الرئيسية",
    worldPulse: "النبض العالمي",
    vohAi: "مساعد الذكاء الاصطناعي VOH",
    activityLabel: "خلاصة الأنشطة",
    myProfile: "الملف الشخصي",
    searchPlaceholder: "البحث في نيكسورا...",
    quickActions: "الإجراءات السريعة",
    currentPulse: "النبض الحالي",
    createPost: "➕ إنشاء منشور",
    premiumFootnote: "شبكة نيكسورا • مميز",
    adminPanel: "🛡️ لوحة التحكم الإدارية",
    watchSession: "👁️ حلقات المشاهدة",
    forgotPassword: "نسيت كلمة المرور؟",
    onboardingTitle: "بروتوكول محاذاة نيكسورا",
    preferredLanguage: "اللغة المفضلة",
    topicsLike: "المواضيع التي تفضلها",
    communitiesWanted: "المجتمعات التي ترغب بها",
    nextStep: "إنتاج المحاذاة المشتركة",
    finishOnboarding: "تنشيط الحساب",
    reportsHeader: "نظام الإشراف والمراجعة",
    reportAction: "الإبلاغ عن المنشور",
    blockAction: "حظْر المستخدم",
    hideAction: "إخفاء المنشور",
    notInterested: "غير مهتم",
    saveCollection: "حفظ في المجموعات",
    savedCollectionsTitle: "المجموعات المحفوظة",
    backupExport: "نسخ البيانات الاحتياطي والخصوصية",
    backupDownload: "تحميل أرشيف البيانات الكامل",
    appHealthTitle: "مؤشرات صحة وجودة التطبيق",
    errorLogger: "سجل الأعطال ومعدلات السرعة",
    registeredAdmins: "المؤسسون والمدراء المعتمدون",
    recoveryEmailLabel: "أدخل بريدك الإلكتروني المسجل",
    recoveryPhoneLabel: "أدخل رقم الهاتف للتحقق عبر رمز SMS",
    deviceVerificationLabel: "التحقق من بصمة الجهاز النشط",
    getAccessKey: "استعادة مفتاح الدخول",
    successMessage: "تم التحقق من العملية وتسجيلها بنجاح",
    navHome: "الرئيسية",
    navExplore: "استكشف",
    navCommunities: "المجتمعات",
    navMessages: "الرسائل",
    navActivity: "النشاط",
    navProfile: "الملف الشخصي",
    navNavigate: "التنقل",
    navCreateDiscover: "أنشئ واكتشف",
    navCreate: "إنشاء",
    navShareMoment: "شارك لحظة",
    navCreatorStudio: "استوديو المنشئين",
    navGrowSignal: "وسّع حضورك",
    navSystemHub: "مركز النظام",
    navSettingsAccessibility: "الإعدادات وإمكانية الوصول",
    navProfileSettings: "إعدادات الملف الشخصي",
    navVisitorPreview: "معاينة الزائر. قد يظهر محتوى تجريبي؛ سجّل الدخول لاستخدام ميزات الحساب.",
    navSignInToPersonalize: "سجّل الدخول للتخصيص",
    navPrimaryNavigation: "التنقل الرئيسي",
    navPrivateByDesign: "الخصوصية في التصميم",
    navPremiumByDefault: "مميز افتراضياً",
    navDailySignal: "إشارتك اليومية",
    navFindPeople: "اعثر على مجتمعك",
    navSharedInterests: "اهتمامات مشتركة",
    navPrivateConversations: "محادثات خاصة",
    navStayInLoop: "ابقَ على اطلاع",
    navYourSpace: "مساحتك",
    filterAll: "كل النتائج",
    filterUsers: "الأشخاص",
    filterPosts: "المنشورات",
    filterVideos: "الفيديوهات",
    filterCommunities: "المجتمعات",
    inboxTitle: "صندوق الوارد",
    inboxChats: "المحادثات",
    inboxRequests: "الطلبات",
    inboxArchived: "المؤرشفة",
    inboxSearchPlaceholder: "ابحث في المحادثات…",
    inboxNewMessage: "رسالة جديدة",
    inboxCreateGroup: "إنشاء مجموعة",
    inboxCreateGroupHeading: "إنشاء محادثة جماعية",
    inboxGroupIntro: "ادعُ حسابات NEXORA حقيقية إلى محادثة مشتركة.",
    inboxGroupName: "اسم المجموعة",
    inboxGroupDescription: "الوصف (اختياري)",
    inboxInviteMembers: "دعوة الأعضاء",
    inboxSelectAtLeastTwo: "اختر عضوين على الأقل",
    inboxSearchPeople: "ابحث عن أشخاص…",
    inboxNoAccounts: "لم يتم العثور على حسابات مطابقة.",
    inboxCancel: "إلغاء",
    inboxCreating: "جارٍ الإنشاء…",
    inboxCreateGroupButton: "إنشاء المجموعة",
    inboxGroupCreatedNotice: "تم إنشاء المحادثة الجماعية وإخطار الأعضاء.",
    inboxNoMatchingConversations: "لا توجد محادثات مطابقة",
    inboxNoMessageRequests: "لا توجد طلبات رسائل",
    inboxNoArchivedConversations: "لا توجد محادثات مؤرشفة",
    inboxNoConversations: "لا توجد محادثات بعد",
    inboxStartConversationHint: "اختر منشئ محتوى أو جهة اتصال لبدء محادثة.",
    inboxStartNewMessage: "رسالة جديدة",
    inboxTyping: "يكتب الآن…",
    inboxActiveNow: "نشط الآن",
    inboxOffline: "غير متصل",
    inboxBack: "العودة إلى المحادثات",
    inboxTryDifferent: "جرّب اسماً أو رسالة أخرى.",
    inboxNewRequestsHint: "ستظهر الطلبات الجديدة هنا.",
    inboxArchivedHint: "ستظهر المحادثات التي تؤرشفها هنا."
  },
  pt: {
    brandDescription: "Descubra pessoas. Construa comunidades. Moldar o que acontece.",
    homeFeed: "Feed Principal",
    worldPulse: "Pulso Global",
    vohAi: "Assistente IA VOH",
    activityLabel: "Feed de Atividades",
    myProfile: "Meu Perfil",
    searchPlaceholder: "Pesquisar no NEXORA...",
    quickActions: "Ações Rápidas",
    currentPulse: "Pulso Atual",
    createPost: "➕ Criar Publicação",
    premiumFootnote: "Rede NEXORA • Premium",
    adminPanel: "🛡️ Painel Administrativo",
    watchSession: "👁️ Sessão de Visualização",
    forgotPassword: "Esqueceu a senha?",
    onboardingTitle: "Protocolo de Alinhamento NEXORA",
    preferredLanguage: "Idioma Preferido",
    topicsLike: "Tópicos de Interesse",
    communitiesWanted: "Comunidades Desejadas",
    nextStep: "Gerar Alinhamentos",
    finishOnboarding: "Ativar Conta",
    reportsHeader: "Moderação do Sistema",
    reportAction: "Reportar Publicação",
    blockAction: "Bloquear Usuário",
    hideAction: "Ocultar Publicação",
    notInterested: "Não Tenho Interesse",
    saveCollection: "Salvar na Coleção",
    savedCollectionsTitle: "Coleções Salvas",
    backupExport: "Backup de Dados & Privacidade",
    backupDownload: "Baixar Arquivo de Dados",
    appHealthTitle: "Métricas de Saúde do App",
    errorLogger: "Logs de Falhas & Desempenho",
    registeredAdmins: "Fundadores & Administradores",
    recoveryEmailLabel: "Insira seu e-mail cadastrado",
    recoveryPhoneLabel: "Insira seu telefone (Token SMS)",
    deviceVerificationLabel: "Verificar via celular confiável",
    getAccessKey: "Recuperar Chave de Acesso",
    successMessage: "Operação verificada e registrada com sucesso",
    navHome: "Início",
    navExplore: "Explorar",
    navCommunities: "Comunidades",
    navMessages: "Mensagens",
    navActivity: "Atividade",
    navProfile: "Perfil",
    navNavigate: "Navegar",
    navCreateDiscover: "Criar e descobrir",
    navCreate: "Criar",
    navShareMoment: "Compartilhe um momento",
    navCreatorStudio: "Estúdio do Criador",
    navGrowSignal: "Amplie sua presença",
    navSystemHub: "Central do Sistema",
    navSettingsAccessibility: "Configurações e acessibilidade",
    navProfileSettings: "Configurações do perfil",
    navVisitorPreview: "Prévia de visitante. Conteúdo de exemplo pode aparecer; entre para usar ações da conta.",
    navSignInToPersonalize: "Entre para personalizar",
    navPrimaryNavigation: "Navegação principal",
    navPrivateByDesign: "Privacidade por princípio",
    navPremiumByDefault: "Premium por padrão",
    navDailySignal: "Seu sinal diário",
    navFindPeople: "Encontre sua comunidade",
    navSharedInterests: "Interesses em comum",
    navPrivateConversations: "Conversas privadas",
    navStayInLoop: "Fique por dentro",
    navYourSpace: "Seu espaço",
    filterAll: "Todos os resultados",
    filterUsers: "Pessoas",
    filterPosts: "Publicações",
    filterVideos: "Vídeos",
    filterCommunities: "Comunidades",
    inboxTitle: "Caixa de entrada",
    inboxChats: "Conversas",
    inboxRequests: "Solicitações",
    inboxArchived: "Arquivadas",
    inboxSearchPlaceholder: "Pesquisar conversas…",
    inboxNewMessage: "Nova mensagem",
    inboxCreateGroup: "Criar grupo",
    inboxCreateGroupHeading: "Criar uma conversa em grupo",
    inboxGroupIntro: "Convide contas reais da NEXORA para uma conversa compartilhada.",
    inboxGroupName: "Nome do grupo",
    inboxGroupDescription: "Descrição (opcional)",
    inboxInviteMembers: "Convidar membros",
    inboxSelectAtLeastTwo: "Selecione pelo menos 2 pessoas",
    inboxSearchPeople: "Pesquisar pessoas…",
    inboxNoAccounts: "Nenhuma conta correspondente encontrada.",
    inboxCancel: "Cancelar",
    inboxCreating: "Criando…",
    inboxCreateGroupButton: "Criar grupo",
    inboxGroupCreatedNotice: "Conversa em grupo criada. Os membros foram notificados.",
    inboxNoMatchingConversations: "Nenhuma conversa correspondente",
    inboxNoMessageRequests: "Nenhuma solicitação de mensagem",
    inboxNoArchivedConversations: "Nenhuma conversa arquivada",
    inboxNoConversations: "Ainda não há conversas",
    inboxStartConversationHint: "Escolha um criador ou contato para iniciar uma conversa.",
    inboxStartNewMessage: "Nova mensagem",
    inboxTyping: "digitando…",
    inboxActiveNow: "Ativo agora",
    inboxOffline: "Offline",
    inboxBack: "Voltar às conversas",
    inboxTryDifferent: "Tente outro nome ou mensagem.",
    inboxNewRequestsHint: "Novas solicitações aparecerão aqui.",
    inboxArchivedHint: "As conversas arquivadas aparecerão aqui."
  }
};

/** Resolve stored language labels/codes to a supported NEXORA locale. */
export function resolveLocale(value?: string | null): Locale {
  const normalized = String(value || 'en').trim().toLowerCase();
  if (normalized === 'ar' || normalized.startsWith('arab')) return 'ar';
  if (normalized === 'fr' || normalized.startsWith('fran')) return 'fr';
  if (normalized === 'pt' || normalized.startsWith('portug')) return 'pt';
  return 'en';
}

/** Arabic uses right-to-left text direction; supported Latin locales remain LTR. */
export function getLocaleDirection(value?: string | null): 'rtl' | 'ltr' {
  return resolveLocale(value) === 'ar' ? 'rtl' : 'ltr';
}

/** Return the complete dictionary for a stored language preference. */
export function getTranslations(value?: string | null): TranslationSet {
  return TRANSLATIONS[resolveLocale(value)];
}
