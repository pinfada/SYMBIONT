# 🚀 **GUIDE DE DÉPLOIEMENT SYMBIONT - PRODUCTION**

## **📋 Vue d'ensemble**

Ce guide vous permet de déployer SYMBIONT en production avec une architecture complète et sécurisée comprenant :

- **Backend API** (Node.js + Express + TypeScript)
- **Base de données** (PostgreSQL + Prisma)
- **Cache** (Redis)
- **Intelligence Artificielle** (Services ML intégrés)
- **WebSocket temps réel** (Socket.io)
- **Monitoring** (Prometheus + Grafana)
- **Proxy inverse** (Nginx + SSL)
- **Backup automatique** (Sauvegarde quotidienne)

## **🛠️ Prérequis**

### **Serveur**
- **OS** : Ubuntu 20.04+ ou CentOS 8+
- **RAM** : 8GB minimum (16GB recommandé)
- **CPU** : 4 cores minimum
- **Stockage** : 100GB SSD minimum
- **Docker** : 20.10+
- **Docker Compose** : 2.0+

### **Domaine & SSL**
- Nom de domaine pointant vers votre serveur
- Certificat SSL (Let's Encrypt recommandé)

### **Ports requis**
- `80` (HTTP)
- `443` (HTTPS)  
- `3001` (API Backend)
- `5432` (PostgreSQL)
- `6379` (Redis)

## **⚡ Déploiement Express (5 minutes)**

### **1. Cloner le repository**
```bash
git clone https://github.com/your-org/symbiont.git
cd symbiont
```

### **2. Configuration environnement**
```bash
cp .env.example .env.production
nano .env.production
```

**Variables obligatoires :**
```env
# Base de données
POSTGRES_PASSWORD=votre_mot_de_passe_super_sécurisé
DATABASE_URL=postgresql://symbiont_user:${POSTGRES_PASSWORD}@localhost:5432/symbiont

# Cache
REDIS_PASSWORD=votre_redis_password_sécurisé

# JWT Secrets (générer avec: openssl rand -base64 64)
JWT_SECRET=votre_jwt_secret_très_long_et_sécurisé
JWT_REFRESH_SECRET=votre_refresh_secret_très_long_et_sécurisé

# Monitoring
GRAFANA_PASSWORD=votre_grafana_password

# API
FRONTEND_URL=https://votre-domaine.com
API_URL=https://api.votre-domaine.com
```

### **3. Lancer la stack complète**
```bash
cd deployment
docker-compose -f docker-compose.production.yml up -d
```

### **4. Vérification**
```bash
# Vérifier que tous les services sont UP
docker-compose ps

# Logs en temps réel
docker-compose logs -f backend
```

**🎉 Votre SYMBIONT est maintenant en ligne !**

## **🔧 Configuration Avancée**

### **SSL avec Let's Encrypt**
```bash
# Installer Certbot
sudo apt install certbot python3-certbot-nginx

# Obtenir certificat
sudo certbot --nginx -d votre-domaine.com -d api.votre-domaine.com

# Auto-renouvellement
sudo crontab -e
# Ajouter: 0 12 * * * /usr/bin/certbot renew --quiet
```

### **Configuration Nginx**
```bash
# Éditer la configuration
nano deployment/nginx/nginx.conf
```

### **Monitoring**
- **Grafana** : `https://votre-domaine.com:3000`
- **Prometheus** : `https://votre-domaine.com:9090`

### **Base de données**
```bash
# Accès PostgreSQL
docker exec -it symbiont_postgres psql -U symbiont_user -d symbiont

# Backup manuel
docker exec symbiont_postgres pg_dump -U symbiont_user symbiont > backup.sql

# Restore
cat backup.sql | docker exec -i symbiont_postgres psql -U symbiont_user -d symbiont
```

## **📊 Métriques de Performance**

### **Objectifs Production**
- **Latence API** : < 100ms (95e percentile)
- **Uptime** : > 99.9%
- **Concurrence** : 1000+ utilisateurs simultanés
- **Mutations/sec** : 100+ 
- **WebSocket** : 10,000+ connexions

### **Monitoring Key**
- CPU/RAM utilisation
- Latence base de données
- Taille cache Redis
- Connexions WebSocket actives
- Taux d'erreur API

## **🔐 Sécurité**

### **Checklist Sécurité**
- [ ] **Firewall** configuré (UFW/iptables)
- [ ] **SSL/TLS** activé partout
- [ ] **Mots de passe** forts (min 32 caractères)
- [ ] **JWT secrets** uniques et longs
- [ ] **Rate limiting** activé
- [ ] **CORS** configuré correctement
- [ ] **Headers sécurité** (Helmet.js)
- [ ] **Logs** audit activés

### **Durcissement serveur**
```bash
# Mise à jour système
sudo apt update && sudo apt upgrade -y

# Désactiver root SSH
sudo nano /etc/ssh/sshd_config
# PermitRootLogin no

# Fail2ban pour SSH
sudo apt install fail2ban
sudo systemctl enable fail2ban

# Firewall basic
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## **📈 Scaling & Optimisation**

### **Scaling Horizontal**
```bash
# Ajouter réplicas backend
docker-compose up -d --scale backend=3

# Load balancer Nginx
# Configuration dans nginx/upstream.conf
```

### **Optimisations Base de Données**
```sql
-- Index pour performances
CREATE INDEX idx_organisms_user_id ON organisms(user_id);
CREATE INDEX idx_behavior_data_user_timestamp ON behavior_data(user_id, created_at);
CREATE INDEX idx_mutations_organism_timestamp ON mutations(organism_id, timestamp);

-- Partitioning pour gros volumes
CREATE TABLE behavior_data_2024 PARTITION OF behavior_data 
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

### **Cache Strategy**
```bash
# Configuration Redis avancée
redis-cli CONFIG SET maxmemory 2gb
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Warm-up cache
curl -X POST https://api.votre-domaine.com/admin/cache/warmup
```

## **🚨 Maintenance & Backup**

### **Backup Automatique**
```bash
# Vérifier backup daily
docker logs symbiont_backup

# Restore depuis backup
docker exec -i symbiont_postgres psql -U symbiont_user -d symbiont < /backup/latest.sql
```

### **Mise à jour Zero-Downtime**
```bash
# Blue-Green deployment
./scripts/deploy.sh --env=production --strategy=blue-green

# Rollback rapide
./scripts/rollback.sh --to=previous
```

### **Health Checks**
```bash
# Script monitoring
#!/bin/bash
curl -f https://api.votre-domaine.com/health || exit 1
docker ps --filter "health=unhealthy" --quiet | wc -l | grep -q "^0$" || exit 1
```

## **🐛 Troubleshooting**

### **Problèmes Courants**

**1. Backend ne démarre pas**
```bash
# Vérifier logs
docker logs symbiont_backend

# Problème DB connection
docker exec symbiont_postgres pg_isready
```

**2. WebSocket déconnexions**
```bash
# Augmenter timeout Nginx
# proxy_read_timeout 3600s;
```

**3. Performances dégradées**
```bash
# Analyser metrics
docker exec -it symbiont_grafana bash

# Top requêtes lentes
docker exec symbiont_postgres psql -U symbiont_user -d symbiont -c "SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

### **Logs Essentiels**
```bash
# Backend API
docker logs -f symbiont_backend

# Base de données
docker logs -f symbiont_postgres

# Nginx access
tail -f deployment/logs/nginx/access.log

# Erreurs système
journalctl -u docker.service -f
```

## **📞 Support Production**

### **Alertes Critiques**
- **Email** : admin@votre-domaine.com
- **Slack** : #symbiont-alerts
- **PagerDuty** : Intégration Grafana

### **Métriques Business**
- **Utilisateurs actifs** quotidiens
- **Mutations générées** par heure
- **Rituels collectifs** complétés
- **Taux rétention** hebdomadaire

## **🎯 Roadmap Post-Déploiement**

### **Semaine 1-2**
- [ ] Monitoring alertes configurées
- [ ] Backup/restore testé
- [ ] Performance baseline établie
- [ ] Documentation équipe

### **Mois 1**
- [ ] Optimisations DB basées données réelles
- [ ] Scaling automatique configuré
- [ ] CI/CD pipeline production
- [ ] Tests charge validés

### **Trimestre 1**  
- [ ] Multi-région si besoin
- [ ] Analytics avancées
- [ ] ML/AI optimisations
- [ ] Mobile app intégration

---

**🚀 Félicitations ! Vous avez déployé SYMBIONT en production.**

*Pour toute question : [documentation.symbiont.app](https://docs.symbiont.app)* 