const fs = require('fs');

const file = 'src/components/ProfileView.tsx';
let content = fs.readFileSync(file, 'utf8');

const subscriptionsPanel = `      {/* 11. SUBSCRIPTIONS MANAGEMENT PAGE */}
      <AnimatePresence>
        {activePanel === 'subscriptions' && (
          <div className="fixed inset-0 z-50 bg-[#04020f] overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 text-left">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <button
                  onClick={() => setActivePanel('profile')}
                  className="flex items-center gap-1 text-xs font-mono text-zinc-400 hover:text-white uppercase font-black cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Profile
                </button>
                <span className="text-xs font-mono text-zinc-400 font-extrabold uppercase">Subscriptions</span>
              </div>
              
              <div className="space-y-6">
                {/* Header Info */}
                <div className="p-6 bg-linear-to-tr from-violet-900/20 to-[#04020f] border border-violet-500/20 rounded-3xl">
                  <h2 className="text-xl font-black text-white mb-2">Creator Subscriptions</h2>
                  <p className="text-sm text-zinc-400">Support your favorite creators, unlock exclusive content, and get premium badges.</p>
                </div>
                
                {/* Tabs */}
                <div className="flex gap-4 border-b border-white/5">
                  <button className="pb-3 text-xs font-bold text-violet-400 border-b-2 border-violet-500">Active Subscriptions</button>
                  <button className="pb-3 text-xs font-bold text-zinc-500 hover:text-zinc-300 transition-colors">Manage Plans</button>
                  <button className="pb-3 text-xs font-bold text-zinc-500 hover:text-zinc-300 transition-colors">Exclusive Content</button>
                </div>

                {/* Subscriptions List */}
                <div className="space-y-4">
                  {[
                    { name: 'Dr. Jane Smith', username: 'drjane', plan: 'Gold Supporter', price: '$4.99/mo', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=60' },
                    { name: 'Tech Insider', username: 'techinsider', plan: 'Premium Access', price: '$9.99/mo', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=60' }
                  ].map(sub => (
                    <div key={sub.username} className="flex items-center justify-between p-4 bg-[#0a0818] border border-white/5 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <img src={sub.avatar} alt={sub.name} className="w-12 h-12 rounded-xl object-cover" />
                        <div>
                          <p className="text-sm font-bold text-white">{sub.name}</p>
                          <p className="text-[10px] font-mono text-zinc-500">@{sub.username}</p>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-violet-400 bg-violet-400/10 px-2 py-0.5 rounded-md">{sub.plan}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-white mb-2">{sub.price}</p>
                        <button className="text-[10px] font-bold text-zinc-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/5">Manage</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 12. LINKED ACCOUNTS MANAGEMENT PAGE */}
      <AnimatePresence>
        {activePanel === 'linked-accounts' && (
          <div className="fixed inset-0 z-50 bg-[#04020f] overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 text-left">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <button
                  onClick={() => setActivePanel('profile')}
                  className="flex items-center gap-1 text-xs font-mono text-zinc-400 hover:text-white uppercase font-black cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Profile
                </button>
                <span className="text-xs font-mono text-zinc-400 font-extrabold uppercase">Linked Accounts</span>
              </div>
              
              <div className="space-y-6">
                {/* Header Info */}
                <div className="p-6 bg-linear-to-tr from-blue-900/20 to-[#04020f] border border-blue-500/20 rounded-3xl">
                  <h2 className="text-xl font-black text-white mb-2">Connected Platforms</h2>
                  <p className="text-sm text-zinc-400">Link your other social profiles and websites to display them on your Nexora profile.</p>
                </div>
                
                {/* Platforms List */}
                <div className="space-y-3">
                  {[
                    { id: 'youtube', name: 'YouTube', icon: '▶️', connected: true, username: 'NexoraCreator' },
                    { id: 'instagram', name: 'Instagram', icon: '📸', connected: true, username: '@nexora_creator' },
                    { id: 'tiktok', name: 'TikTok', icon: '🎵', connected: false },
                    { id: 'x', name: 'X', icon: '✖️', connected: false },
                    { id: 'github', name: 'GitHub', icon: '🐙', connected: true, username: 'nexora-dev' },
                    { id: 'website', name: 'Personal Website', icon: '🌐', connected: false }
                  ].map(platform => (
                    <div key={platform.id} className="flex items-center justify-between p-4 bg-[#0a0818] border border-white/5 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-lg">{platform.icon}</div>
                        <div>
                          <p className="text-sm font-bold text-white">{platform.name}</p>
                          {platform.connected ? (
                            <p className="text-[10px] font-mono text-emerald-400">Connected as {platform.username}</p>
                          ) : (
                            <p className="text-[10px] font-mono text-zinc-500">Not connected</p>
                          )}
                        </div>
                      </div>
                      <div>
                        {platform.connected ? (
                          <button className="text-[10px] font-bold text-zinc-400 hover:text-red-400 transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/5">Disconnect</button>
                        ) : (
                          <button className="text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors px-3 py-1.5 rounded-lg shadow-md shadow-blue-900/20">Connect</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>`;

// Replace old Subscriptions page
const startIdx = content.indexOf('{/* 11. SUBSCRIPTIONS MANAGEMENT PAGE */}');
const endIdx = content.indexOf('{/* 10. EDIT PROFILE MODAL SCREEN (With live preview) */}');

if (startIdx !== -1 && endIdx !== -1) {
  content = content.substring(0, startIdx) + subscriptionsPanel + '\n\n      ' + content.substring(endIdx);
  fs.writeFileSync(file, content);
  console.log('Updated panels');
} else {
  console.log('Could not find indices');
}
