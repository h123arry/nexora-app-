const fs = require('fs');

// 1. Patch SlideDownMenu.tsx: change touch-none to touch-auto
let slideMenu = fs.readFileSync('src/components/SlideDownMenu.tsx', 'utf8');
slideMenu = slideMenu.replace('touch-none', 'touch-auto');
fs.writeFileSync('src/components/SlideDownMenu.tsx', slideMenu);

// 2. Patch App.tsx: remove duplicate toggleNavMenu listener and duplicate SlideDownMenu instance
let appCode = fs.readFileSync('src/App.tsx', 'utf8');

// Remove duplicate listener
appCode = appCode.replace("window.addEventListener('toggleNavMenu', handleToggleNavMenu);", "");
appCode = appCode.replace("window.removeEventListener('toggleNavMenu', handleToggleNavMenu);", "");

// Update first SlideDownMenu instance to clear viewedUser
const oldFirstSlideMenu = `<SlideDownMenu
        isOpen={isNavMenuOpen}
        onClose={() => setIsNavMenuOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        matrixSubTabRedirect={matrixSubTabRedirect}
        unreadMessagesCount={unreadMessagesCount}
        unreadNotificationsCount={unreadNotificationsCount}
      />`;

const newFirstSlideMenu = `<SlideDownMenu
        isOpen={isNavMenuOpen}
        onClose={() => setIsNavMenuOpen(false)}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setViewedUser(null);
        }}
        matrixSubTabRedirect={matrixSubTabRedirect}
        unreadMessagesCount={unreadMessagesCount}
        unreadNotificationsCount={unreadNotificationsCount}
      />`;

if (appCode.includes(oldFirstSlideMenu)) {
  appCode = appCode.replace(oldFirstSlideMenu, newFirstSlideMenu);
}

// Remove second SlideDownMenu instance
const secondSlideMenuBlock = `      {/* Slide-Down Navigation Menu */}
      <SlideDownMenu
        isOpen={isNavMenuOpen}
        onClose={() => setIsNavMenuOpen(false)}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setViewedUser(null);
        }}
        unreadMessagesCount={unreadMessagesCount}
        unreadNotificationsCount={unreadNotificationsCount}
      />`;

if (appCode.includes(secondSlideMenuBlock)) {
  appCode = appCode.replace(secondSlideMenuBlock, '');
}

fs.writeFileSync('src/App.tsx', appCode);
console.log('Patch applied successfully.');
