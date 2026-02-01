/**
 * CDNWhitelist - False Positive Prevention for CDN Detection
 *
 * Maintains a whitelist of known CDN providers to prevent false positive
 * correlations when sites share common infrastructure.
 *
 * @module CDNWhitelist
 */

import { logger } from '@/shared/utils/secureLogger';

/**
 * CDN detection and whitelisting service
 */
export class CDNWhitelist {
  // Major CDN providers and their patterns
  private readonly cdnPatterns = new Map<string, RegExp[]>([
    ['cloudflare', [
      /cloudflare\.com$/i,
      /cloudflare-dns\.com$/i,
      /cloudflaressl\.com$/i,
      /cf-ipfs\.com$/i
    ]],
    ['akamai', [
      /akamai\.net$/i,
      /akamaihd\.net$/i,
      /akamaiedge\.net$/i,
      /akamaitechnologies\.com$/i
    ]],
    ['fastly', [
      /fastly\.net$/i,
      /fastlylb\.net$/i,
      /fsly\.net$/i
    ]],
    ['cloudfront', [
      /cloudfront\.net$/i,
      /amazonaws\.com$/i,
      /aws\.amazon\.com$/i
    ]],
    ['google', [
      /googleapis\.com$/i,
      /gstatic\.com$/i,
      /googleusercontent\.com$/i,
      /googlevideo\.com$/i,
      /google-analytics\.com$/i
    ]],
    ['microsoft', [
      /azure\.com$/i,
      /azureedge\.net$/i,
      /msecnd\.net$/i,
      /windows\.net$/i
    ]],
    ['stackpath', [
      /stackpath\.com$/i,
      /stackpathcdn\.com$/i,
      /bootstrapcdn\.com$/i
    ]],
    ['bunnycdn', [
      /bunnycdn\.com$/i,
      /b-cdn\.net$/i
    ]],
    ['jsDelivr', [
      /jsdelivr\.net$/i,
      /jsdelivr\.com$/i
    ]],
    ['unpkg', [
      /unpkg\.com$/i
    ]],
    ['cdnjs', [
      /cdnjs\.cloudflare\.com$/i,
      /cdnjs\.com$/i
    ]],
    ['facebook', [
      /fbcdn\.net$/i,
      /facebook\.com$/i,
      /fbsbx\.com$/i
    ]]
  ]);

  // Known shared infrastructure patterns
  private readonly sharedInfrastructurePatterns = [
    // Shared hosting providers
    /\.github\.io$/i,
    /\.gitlab\.io$/i,
    /\.netlify\.app$/i,
    /\.vercel\.app$/i,
    /\.herokuapp\.com$/i,
    /\.surge\.sh$/i,

    // Common analytics and tracking (legitimate)
    /google-analytics\.com$/i,
    /googletagmanager\.com$/i,
    /segment\.com$/i,
    /amplitude\.com$/i,

    // Common fonts and assets
    /fonts\.googleapis\.com$/i,
    /typekit\.net$/i,
    /use\.fontawesome\.com$/i
  ];

  // Dynamic CDN cache (learned from observation)
  private dynamicCDNCache = new Set<string>();
  private readonly MAX_CACHE_SIZE = 1000;

  /**
   * Checks if a domain is a known CDN
   */
  public isCDN(domain: string): boolean {
    if (!domain) return false;

    // Check cache first
    if (this.dynamicCDNCache.has(domain)) {
      return true;
    }

    // Check against known CDN patterns
    for (const [cdnName, patterns] of this.cdnPatterns) {
      for (const pattern of patterns) {
        if (pattern.test(domain)) {
          this.addToCache(domain);
          logger.debug('[CDNWhitelist] CDN detected', {
            domain,
            provider: cdnName
          });
          return true;
        }
      }
    }

    // Check shared infrastructure patterns
    for (const pattern of this.sharedInfrastructurePatterns) {
      if (pattern.test(domain)) {
        this.addToCache(domain);
        return true;
      }
    }

    return false;
  }

  /**
   * Checks if a URL points to a CDN resource
   */
  public isCDNUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return this.isCDN(urlObj.hostname);
    } catch {
      return false;
    }
  }

  /**
   * Analyzes if two domains share CDN but are otherwise unrelated
   */
  public sharesCDNOnly(domain1: string, domain2: string): boolean {
    // Extract base domains (remove subdomains)
    const base1 = this.extractBaseDomain(domain1);
    const base2 = this.extractBaseDomain(domain2);

    // If same base domain, they're related
    if (base1 === base2) {
      return false;
    }

    // Check if both use same CDN
    const cdn1 = this.identifyCDN(domain1);
    const cdn2 = this.identifyCDN(domain2);

    return cdn1 !== null && cdn1 === cdn2;
  }

  /**
   * Identifies which CDN provider a domain uses
   */
  public identifyCDN(domain: string): string | null {
    if (!domain) return null;

    for (const [cdnName, patterns] of this.cdnPatterns) {
      for (const pattern of patterns) {
        if (pattern.test(domain)) {
          return cdnName;
        }
      }
    }

    return null;
  }

  /**
   * Extracts base domain from full domain
   */
  private extractBaseDomain(domain: string): string {
    // Simple extraction (could be enhanced with public suffix list)
    const parts = domain.split('.');
    if (parts.length > 2) {
      // Return last two parts (e.g., example.com from www.example.com)
      return parts.slice(-2).join('.');
    }
    return domain;
  }

  /**
   * Adds domain to dynamic cache
   */
  private addToCache(domain: string): void {
    this.dynamicCDNCache.add(domain);

    // Prevent cache from growing too large
    if (this.dynamicCDNCache.size > this.MAX_CACHE_SIZE) {
      // Remove oldest entries (convert to array, remove first 100)
      const entries = Array.from(this.dynamicCDNCache);
      const toRemove = entries.slice(0, 100);
      toRemove.forEach(d => this.dynamicCDNCache.delete(d));
    }
  }

  /**
   * Analyzes resource list for CDN usage patterns
   */
  public analyzeCDNUsage(resources: Array<{ url: string; domain: string }>): {
    cdnResources: number;
    totalResources: number;
    cdnProviders: Set<string>;
    cdnPercentage: number;
  } {
    const cdnProviders = new Set<string>();
    let cdnResources = 0;

    for (const resource of resources) {
      const cdn = this.identifyCDN(resource.domain);
      if (cdn) {
        cdnResources++;
        cdnProviders.add(cdn);
      }
    }

    return {
      cdnResources,
      totalResources: resources.length,
      cdnProviders,
      cdnPercentage: resources.length > 0 ?
        (cdnResources / resources.length) * 100 : 0
    };
  }

  /**
   * Filters out CDN domains from a list
   */
  public filterNonCDN(domains: string[]): string[] {
    return domains.filter(domain => !this.isCDN(domain));
  }

  /**
   * Enhanced correlation check considering CDN usage
   */
  public adjustCorrelationForCDN(
    correlation: number,
    domain1: string,
    domain2: string,
    sharedResources: string[]
  ): number {
    // If domains share CDN, reduce correlation weight
    if (this.sharesCDNOnly(domain1, domain2)) {
      correlation *= 0.5; // Halve the correlation score
    }

    // Check if shared resources are mostly CDN
    const cdnSharedCount = sharedResources.filter(r => this.isCDNUrl(r)).length;
    const cdnRatio = sharedResources.length > 0 ?
      cdnSharedCount / sharedResources.length : 0;

    // Further reduce correlation if most shared resources are CDN
    if (cdnRatio > 0.7) {
      correlation *= (1 - cdnRatio * 0.5); // Reduce by up to 50%
    }

    return correlation;
  }

  /**
   * Learns new CDN patterns from observed data
   */
  public learnCDNPattern(domain: string, confidence: number): void {
    // Only learn high-confidence CDN patterns
    if (confidence < 0.8) return;

    // Don't learn if already known
    if (this.isCDN(domain)) return;

    // Add to dynamic cache for future detection
    this.addToCache(domain);

    logger.info('[CDNWhitelist] Learned new CDN pattern', {
      domain,
      confidence,
      cacheSize: this.dynamicCDNCache.size
    });
  }

  /**
   * Get CDN statistics
   */
  public getStatistics(): {
    knownProviders: number;
    cachedDomains: number;
    patterns: number;
  } {
    let totalPatterns = 0;
    for (const patterns of this.cdnPatterns.values()) {
      totalPatterns += patterns.length;
    }

    return {
      knownProviders: this.cdnPatterns.size,
      cachedDomains: this.dynamicCDNCache.size,
      patterns: totalPatterns + this.sharedInfrastructurePatterns.length
    };
  }

  /**
   * Export learned CDN patterns for persistence
   */
  public exportLearnedPatterns(): string[] {
    return Array.from(this.dynamicCDNCache);
  }

  /**
   * Import previously learned CDN patterns
   */
  public importLearnedPatterns(patterns: string[]): void {
    patterns.forEach(pattern => this.addToCache(pattern));

    logger.info('[CDNWhitelist] Imported learned patterns', {
      count: patterns.length
    });
  }

  /**
   * Reset to default patterns only
   */
  public reset(): void {
    this.dynamicCDNCache.clear();
    logger.info('[CDNWhitelist] Reset to default patterns');
  }
}