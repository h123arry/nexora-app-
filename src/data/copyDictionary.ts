const DEFAULT_TERMINOLOGY = {
  // Followers / Following
  followers: 'followers',
  followersUpper: 'FOLLOWERS',
  followersCapitalized: 'Followers',
  follower: 'follower',
  followerCapitalized: 'Follower',
  following: 'following',
  followingCapitalized: 'Following',
  followingUpper: 'FOLLOWING',

  // Communities / Circles
  communities: 'communities',
  communitiesCapitalized: 'Communities',
  communitiesUpper: 'COMMUNITIES',
  community: 'community',
  communityCapitalized: 'Community',
  communityUpper: 'COMMUNITY',
  circles: 'circles',
  circlesCapitalized: 'Circles',
  circlesUpper: 'CIRCLES',
  circle: 'circle',
  circleCapitalized: 'Circle',
  circleUpper: 'CIRCLE',

  // Nodes / Locations / Networks
  nodes: 'locations',
  nodesCapitalized: 'Locations',
  nodesUpper: 'LOCATIONS',
  node: 'location',
  nodeCapitalized: 'Location',
  nodeUpper: 'LOCATION',
  networks: 'networks',
  networksCapitalized: 'Networks',
  networksUpper: 'NETWORKS',
  network: 'network',
  networkCapitalized: 'Network',
  networkUpper: 'NETWORK',

  // Sparks / Likes
  sparks: 'sparks',
  sparksCapitalized: 'Sparks',
  sparksUpper: 'SPARKS',
  spark: 'spark',
  sparkCapitalized: 'Spark',
  sparkUpper: 'SPARK',

  // Loops / Media
  loops: 'loops',
  loopsCapitalized: 'Loops',
  loopsUpper: 'LOOPS',
  loop: 'loop',
  loopCapitalized: 'Loop',
  loopUpper: 'LOOP'
};

export const TERMINOLOGY = { ...DEFAULT_TERMINOLOGY };

// Initialize from localStorage if on client side
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem('nexora_terminology_custom');
    if (saved) {
      const parsed = JSON.parse(saved);
      Object.assign(TERMINOLOGY, parsed);
    }
  } catch (e) {
    console.error('Failed to load local terminology', e);
  }
}

/**
 * Updates the terminology dictionary and persists to localStorage if client-side
 */
export function updateTerminology(key: keyof typeof DEFAULT_TERMINOLOGY, value: string) {
  TERMINOLOGY[key] = value;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('nexora_terminology_custom', JSON.stringify(TERMINOLOGY));
    } catch (e) {
      console.error('Failed to save local terminology', e);
    }
  }
}

/**
 * Reset terminology to system defaults
 */
export function resetTerminology() {
  Object.assign(TERMINOLOGY, DEFAULT_TERMINOLOGY);
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('nexora_terminology_custom');
    } catch (e) {
      console.error('Failed to clear local terminology', e);
    }
  }
}

/**
 * Replaces hardcoded terminology terms inside dynamic text, prompt configurations, and VOH AI assist parameters.
 */
export function replaceTerminology(text: string): string {
  if (!text) return text;
  let result = text;
  
  // Replace Nodes / Node
  result = result.replace(/\bnodes\b/g, TERMINOLOGY.nodes);
  result = result.replace(/\bNodes\b/g, TERMINOLOGY.nodesCapitalized);
  result = result.replace(/\bNODES\b/g, TERMINOLOGY.nodesUpper);
  result = result.replace(/\bnode\b/g, TERMINOLOGY.node);
  result = result.replace(/\bNode\b/g, TERMINOLOGY.nodeCapitalized);
  result = result.replace(/\bNODE\b/g, TERMINOLOGY.nodeUpper);

  // Replace Networks / Network
  result = result.replace(/\bnetworks\b/g, TERMINOLOGY.networks);
  result = result.replace(/\bNetworks\b/g, TERMINOLOGY.networksCapitalized);
  result = result.replace(/\bNETWORKS\b/g, TERMINOLOGY.networksUpper);
  result = result.replace(/\bnetwork\b/g, TERMINOLOGY.network);
  result = result.replace(/\bNetwork\b/g, TERMINOLOGY.networkCapitalized);
  result = result.replace(/\bNETWORK\b/g, TERMINOLOGY.networkUpper);

  // Replace Communities / Community
  result = result.replace(/\bcommunities\b/g, TERMINOLOGY.communities);
  result = result.replace(/\bCommunities\b/g, TERMINOLOGY.communitiesCapitalized);
  result = result.replace(/\bCOMMUNITIES\b/g, TERMINOLOGY.communitiesUpper);
  result = result.replace(/\bcommunity\b/g, TERMINOLOGY.community);
  result = result.replace(/\bCommunity\b/g, TERMINOLOGY.communityCapitalized);
  result = result.replace(/\bCOMMUNITY\b/g, TERMINOLOGY.communityUpper);

  // Replace Circles / Circle
  result = result.replace(/\bcircles\b/g, TERMINOLOGY.circles);
  result = result.replace(/\bCircles\b/g, TERMINOLOGY.circlesCapitalized);
  result = result.replace(/\bCIRCLES\b/g, TERMINOLOGY.circlesUpper);
  result = result.replace(/\bcircle\b/g, TERMINOLOGY.circle);
  result = result.replace(/\bCircle\b/g, TERMINOLOGY.circleCapitalized);
  result = result.replace(/\bCIRCLE\b/g, TERMINOLOGY.circleUpper);

  // Replace Followers / Follower / Following
  result = result.replace(/\bfollowers\b/g, TERMINOLOGY.followers);
  result = result.replace(/\bFollowers\b/g, TERMINOLOGY.followersCapitalized);
  result = result.replace(/\bFOLLOWERS\b/g, TERMINOLOGY.followersUpper);
  result = result.replace(/\bfollower\b/g, TERMINOLOGY.follower);
  result = result.replace(/\bFollower\b/g, TERMINOLOGY.followerCapitalized);
  result = result.replace(/\bfollowing\b/g, TERMINOLOGY.following);
  result = result.replace(/\bFollowing\b/g, TERMINOLOGY.followingCapitalized);
  result = result.replace(/\bFOLLOWING\b/g, TERMINOLOGY.followingUpper);

  // Replace Sparks / Spark
  result = result.replace(/\bsparks\b/g, TERMINOLOGY.sparks);
  result = result.replace(/\bSparks\b/g, TERMINOLOGY.sparksCapitalized);
  result = result.replace(/\bSPARKS\b/g, TERMINOLOGY.sparksUpper);
  result = result.replace(/\bspark\b/g, TERMINOLOGY.spark);
  result = result.replace(/\bSpark\b/g, TERMINOLOGY.sparkCapitalized);
  result = result.replace(/\bSPARK\b/g, TERMINOLOGY.sparkUpper);

  // Replace Loops / Loop
  result = result.replace(/\bloops\b/g, TERMINOLOGY.loops);
  result = result.replace(/\bLoops\b/g, TERMINOLOGY.loopsCapitalized);
  result = result.replace(/\bLOOPS\b/g, TERMINOLOGY.loopsUpper);
  result = result.replace(/\bloop\b/g, TERMINOLOGY.loop);
  result = result.replace(/\bLoop\b/g, TERMINOLOGY.loopCapitalized);
  result = result.replace(/\bLOOP\b/g, TERMINOLOGY.loopUpper);

  return result;
}
