-- ============================================================================
-- FUEL PROVISIONING SYSTEM - OPTIMIZED SCHEMA (PostgreSQL)
-- ============================================================================
-- Version: 3.0 - Simplified and Optimized
-- Date: 2025-02-03
-- Database: PostgreSQL 12+
-- ============================================================================

-- Drop existing tables
DROP TABLE IF EXISTS approvisionnement CASCADE;
DROP TABLE IF EXISTS dotation CASCADE;
DROP TABLE IF EXISTS vehicule CASCADE;
DROP TABLE IF EXISTS benificiaire CASCADE;
DROP TABLE IF EXISTS service CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Users Table
CREATE TABLE users (
    id_user SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'AGENT' CHECK (role IN ('ADMIN', 'AGENT')),
    statut VARCHAR(20) DEFAULT 'ACTIF' CHECK (statut IN ('ACTIF', 'INACTIF'))
);

-- Service Table
CREATE TABLE service (
    id SERIAL PRIMARY KEY,
    nom TEXT NOT NULL,
    direction TEXT NOT NULL
);

-- Beneficiaire Table
CREATE TABLE benificiaire (
    id SERIAL PRIMARY KEY,
    matricule TEXT NOT NULL UNIQUE,
    nom TEXT NOT NULL,
    fonction TEXT NOT NULL,
    service_id INTEGER NOT NULL,
    FOREIGN KEY (service_id) REFERENCES service(id) ON DELETE RESTRICT
);

-- Vehicule Table
CREATE TABLE vehicule (
    id SERIAL PRIMARY KEY,
    police VARCHAR(20) NOT NULL UNIQUE,
    nCivil VARCHAR(30) NOT NULL UNIQUE,
    marque VARCHAR(50),
    carburant VARCHAR(20) NOT NULL CHECK (carburant IN ('gazoil', 'essence')),
    km INTEGER NOT NULL CHECK (km >= 0),
    actif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dotation Table
CREATE TABLE dotation (
    id SERIAL PRIMARY KEY,
    vehicule_id INTEGER NOT NULL,
    benificiaire_id INTEGER NOT NULL,
    mois INTEGER NOT NULL CHECK (mois BETWEEN 1 AND 12),
    annee INTEGER NOT NULL CHECK (annee >= 2020),
    qte INTEGER NOT NULL CHECK (qte IN (120, 140)),
    qte_consomme NUMERIC(6,2) DEFAULT 0 CHECK (qte_consomme >= 0),
    reste NUMERIC(6,2) GENERATED ALWAYS AS (qte - qte_consomme) STORED,
    cloture BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (vehicule_id, mois, annee),
    FOREIGN KEY (benificiaire_id) REFERENCES benificiaire(id) ON DELETE RESTRICT,
    FOREIGN KEY (vehicule_id) REFERENCES vehicule(id) ON DELETE CASCADE
);

-- Approvisionnement Table
CREATE TABLE approvisionnement (
    id SERIAL PRIMARY KEY,
    type_approvi VARCHAR(20) NOT NULL CHECK (type_approvi IN ('DOTATION', 'MISSION')),
    date TIMESTAMP NOT NULL DEFAULT NOW(),
    qte NUMERIC(6,2) NOT NULL CHECK (qte > 0),
    km_precedent INTEGER NOT NULL,
    km INTEGER NOT NULL CHECK (km > km_precedent),
    anomalie BOOLEAN DEFAULT FALSE,
    
    -- DOTATION specific fields
    dotation_id INT NULL,
    
    -- Temporary vehicle fields (optional - for DOTATION when using different vehicle)
    vhc_provisoire VARCHAR(50) NULL,  -- Temporary vehicle identifier (police number)
    km_provisoire INTEGER NULL CHECK (km_provisoire >= 0),  -- Km of temporary vehicle
    
    -- MISSION specific fields
    matricule_conducteur VARCHAR(50) NULL,
    service_externe VARCHAR(100) NULL,
    ville_origine VARCHAR(100) NULL,
    ordre_mission VARCHAR(100) NULL,
    police_vehicule VARCHAR(50) NULL,  -- Vehicle police number for MISSION
    
    -- Common fields
    observations TEXT,
    numero_bon VARCHAR(50) UNIQUE,
    
    -- Constraints
    CONSTRAINT chk_dotation_fields CHECK (
        (type_approvi = 'DOTATION' AND dotation_id IS NOT NULL AND ordre_mission IS NULL) OR
        (type_approvi = 'MISSION' AND ordre_mission IS NOT NULL AND dotation_id IS NULL)
    ),
    FOREIGN KEY (dotation_id) REFERENCES dotation(id) ON DELETE RESTRICT
);

-- Create indexes for better performance
CREATE INDEX idx_dotation_vehicule ON dotation(vehicule_id);
CREATE INDEX idx_dotation_benificiaire ON dotation(benificiaire_id);
CREATE INDEX idx_dotation_mois_annee ON dotation(mois, annee);
CREATE INDEX idx_dotation_cloture ON dotation(cloture);
CREATE INDEX idx_approvi_type ON approvisionnement(type_approvi);
CREATE INDEX idx_approvi_date ON approvisionnement(date);
CREATE INDEX idx_approvi_dotation ON approvisionnement(dotation_id);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View for DOTATION Approvisionnements with full details
CREATE OR REPLACE VIEW v_appro_dotation AS
SELECT 
    a.id,
    a.date,
    a.numero_bon,
    a.qte,
    a.km_precedent,
    a.km,
    a.anomalie,
    a.observations,
    -- Vehicle info (main vehicle from dotation)
    v.id AS vehicule_id,
    v.police,
    v.nCivil,
    v.marque,
    v.carburant,
    -- Temporary vehicle info (from this specific approvisionnement)
    a.vhc_provisoire,
    a.km_provisoire,
    CASE 
        WHEN a.vhc_provisoire IS NOT NULL THEN a.vhc_provisoire 
        ELSE v.police 
    END AS vehicule_utilise,
    -- Dotation info
    d.id AS dotation_id,
    d.mois,
    d.annee,
    d.qte AS dotation_qte,
    d.qte_consomme,
    d.reste AS dotation_reste,
    d.cloture,
    -- Beneficiaire info
    b.id AS benificiaire_id,
    b.matricule AS benificiaire_matricule,
    b.nom AS benificiaire_nom,
    b.fonction AS benificiaire_fonction,
    -- Service info
    s.nom AS service_nom,
    s.direction AS service_direction
FROM approvisionnement a
JOIN dotation d ON a.dotation_id = d.id
JOIN vehicule v ON d.vehicule_id = v.id
JOIN benificiaire b ON d.benificiaire_id = b.id
JOIN service s ON b.service_id = s.id
WHERE a.type_approvi = 'DOTATION'
ORDER BY a.date DESC;

-- View for MISSION Approvisionnements with full details
CREATE OR REPLACE VIEW v_appro_mission AS
SELECT 
    a.id,
    a.date,
    a.numero_bon,
    a.qte,
    a.km_precedent,
    a.km,
    a.anomalie,
    a.observations,
    a.matricule_conducteur,
    a.service_externe,
    a.ville_origine,
    a.ordre_mission,
    a.police_vehicule
FROM approvisionnement a
WHERE a.type_approvi = 'MISSION'
ORDER BY a.date DESC;

-- View for summary of all approvisionnements
CREATE OR REPLACE VIEW v_appro_summary AS
SELECT 
    a.id,
    a.type_approvi,
    a.date,
    a.numero_bon,
    a.qte,
    a.km,
    CASE 
        WHEN a.type_approvi = 'DOTATION' THEN 
            v.police || ' - ' || b.nom
        ELSE 
            a.matricule_conducteur
    END AS responsable,
    CASE 
        WHEN a.type_approvi = 'DOTATION' THEN v.carburant
        ELSE NULL
    END AS carburant
FROM approvisionnement a
LEFT JOIN dotation d ON a.dotation_id = d.id
LEFT JOIN vehicule v ON d.vehicule_id = v.id
LEFT JOIN benificiaire b ON d.benificiaire_id = b.id
ORDER BY a.date DESC;

-- View for dotation status (current month)
CREATE OR REPLACE VIEW v_dotation_status AS
SELECT 
    d.id,
    d.mois,
    d.annee,
    v.police,
    v.nCivil,
    v.marque,
    b.matricule AS benificiaire_matricule,
    b.nom AS benificiaire_nom,
    b.fonction,
    s.nom AS service_nom,
    d.qte AS dotation_mensuelle,
    d.qte_consomme,
    d.reste,
    ROUND((d.qte_consomme / d.qte * 100), 2) AS pourcentage_utilise,
    d.cloture,
    d.created_at
FROM dotation d
JOIN vehicule v ON d.vehicule_id = v.id
JOIN benificiaire b ON d.benificiaire_id = b.id
JOIN service s ON b.service_id = s.id
WHERE d.mois = EXTRACT(MONTH FROM CURRENT_DATE)
  AND d.annee = EXTRACT(YEAR FROM CURRENT_DATE)
ORDER BY d.cloture, d.reste;

-- ============================================================================
-- TRIGGER FUNCTIONS
-- ============================================================================

-- 1. TRIGGER: Update qte_consomme after approvisionnement
CREATE OR REPLACE FUNCTION update_qte_consomme()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.type_approvi = 'DOTATION' THEN
        -- Update the consumed quantity in dotation
        UPDATE dotation
        SET qte_consomme = qte_consomme + NEW.qte
        WHERE id = NEW.dotation_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_qte_consomme
    AFTER INSERT ON approvisionnement
    FOR EACH ROW
    EXECUTE FUNCTION update_qte_consomme();

-- 2. TRIGGER: Check if dotation quantity is exceeded and auto-close if needed
CREATE OR REPLACE FUNCTION check_and_close_dotation()
RETURNS TRIGGER AS $$
DECLARE
    v_reste NUMERIC(6,2);
BEGIN
    -- Get the remaining quantity after update
    SELECT reste INTO v_reste
    FROM dotation
    WHERE id = NEW.id;
    
    -- If reste is 0 or negative, close the dotation
    IF v_reste <= 0 THEN
        NEW.cloture = TRUE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_close_dotation
    BEFORE UPDATE OF qte_consomme ON dotation
    FOR EACH ROW
    EXECUTE FUNCTION check_and_close_dotation();

-- 3. TRIGGER: Update vehicle kilometrage after approvisionnement (only for main vehicle)
CREATE OR REPLACE FUNCTION update_vehicule_km()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.type_approvi = 'DOTATION' THEN
        -- Only update vehicle km if NOT using temporary vehicle
        IF NEW.vhc_provisoire IS NULL THEN
            UPDATE vehicule v
            SET km = NEW.km
            FROM dotation d
            WHERE d.id = NEW.dotation_id
              AND v.id = d.vehicule_id
              AND NEW.km > v.km;
        END IF;
        -- If vhc_provisoire is set, we don't update the main vehicle's km
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_vehicule_km
    AFTER INSERT ON approvisionnement
    FOR EACH ROW
    EXECUTE FUNCTION update_vehicule_km();

-- 4. TRIGGER: Deny approvisionnement if dotation is closed
CREATE OR REPLACE FUNCTION check_dotation_status()
RETURNS TRIGGER AS $$
DECLARE
    v_cloture BOOLEAN;
    v_reste NUMERIC(6,2);
BEGIN
    IF NEW.type_approvi = 'DOTATION' THEN
        -- Check if dotation exists and is not closed
        SELECT cloture, reste INTO v_cloture, v_reste
        FROM dotation
        WHERE id = NEW.dotation_id;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Dotation avec ID % n''existe pas', NEW.dotation_id;
        END IF;
        
        IF v_cloture = TRUE THEN
            RAISE EXCEPTION 'Cette dotation est clôturée. Aucun approvisionnement n''est autorisé.';
        END IF;
        
        -- Check if requested quantity exceeds remaining quantity
        IF NEW.qte > v_reste THEN
            RAISE EXCEPTION 'Quantité demandée (%) dépasse la quantité restante (%). Dotation insuffisante.', 
                NEW.qte, v_reste;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_dotation_status
    BEFORE INSERT ON approvisionnement
    FOR EACH ROW
    EXECUTE FUNCTION check_dotation_status();

-- 5. TRIGGER: Auto-close previous month dotations when new dotation is created
CREATE OR REPLACE FUNCTION close_previous_dotation()
RETURNS TRIGGER AS $$
BEGIN
    -- Close any previous dotations for the same vehicle that are still open
    UPDATE dotation
    SET cloture = TRUE
    WHERE vehicule_id = NEW.vehicule_id
      AND cloture = FALSE
      AND id != NEW.id
      AND (
          (annee < NEW.annee) OR 
          (annee = NEW.annee AND mois < NEW.mois)
      );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_close_previous_dotation
    AFTER INSERT ON dotation
    FOR EACH ROW
    EXECUTE FUNCTION close_previous_dotation();

-- 6. TRIGGER: Auto-generate numero_bon if not provided
CREATE OR REPLACE FUNCTION generate_numero_bon()
RETURNS TRIGGER AS
$$
DECLARE
    v_dotation_numordre INT;
    v_sequence INT;
BEGIN

    IF NEW.numero_bon IS NOT NULL THEN
        RETURN NEW;
    END IF;

    ---------------------------------------------------
    -- DOTATION CASE
    ---------------------------------------------------
    IF NEW.type_approvi = 'DOTATION' THEN

        SELECT numordre
        INTO v_dotation_numordre
        FROM dotation
        WHERE id = NEW.dotation_id;

        -- Sequence ONLY within this dotation
        SELECT COUNT(*) + 1
        INTO v_sequence
        FROM approvisionnement
        WHERE dotation_id = NEW.dotation_id;

        NEW.numero_bon :=
            v_dotation_numordre || '/' || v_sequence;

    ---------------------------------------------------
    -- MISSION CASE
    ---------------------------------------------------
    ELSE

        -- Global mission counter
        SELECT COUNT(*) + 1
        INTO v_sequence
        FROM approvisionnement
        WHERE type_approvi = 'MISSION';

        NEW.numero_bon := v_sequence::TEXT;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER trg_generate_numero_bon
    BEFORE INSERT ON approvisionnement
    FOR EACH ROW
    EXECUTE FUNCTION generate_numero_bon();

-- 7. TRIGGER: Validate km is greater than km_precedent
CREATE OR REPLACE FUNCTION validate_kilometrage()
RETURNS TRIGGER AS $$
BEGIN
    -- Check km is greater than km_precedent
    IF NEW.km <= NEW.km_precedent THEN
        RAISE EXCEPTION 'Le kilométrage actuel (%) doit être supérieur au kilométrage précédent (%)', 
            NEW.km, NEW.km_precedent;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_kilometrage
    BEFORE INSERT ON approvisionnement
    FOR EACH ROW
    EXECUTE FUNCTION validate_kilometrage();

-- ============================================================================
-- USEFUL FUNCTIONS
-- ============================================================================

-- Function to get current dotation for a vehicle
CREATE OR REPLACE FUNCTION get_current_dotation(p_vehicule_id INTEGER)
RETURNS TABLE(
    dotation_id INTEGER,
    qte INTEGER,
    qte_consomme NUMERIC,
    reste NUMERIC,
    cloture BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.qte,
        d.qte_consomme,
        d.reste,
        d.cloture
    FROM dotation d
    WHERE d.vehicule_id = p_vehicule_id
      AND d.mois = EXTRACT(MONTH FROM CURRENT_DATE)
      AND d.annee = EXTRACT(YEAR FROM CURRENT_DATE)
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to check if approvisionnement would exceed dotation
CREATE OR REPLACE FUNCTION check_dotation_disponible(
    p_dotation_id INTEGER,
    p_qte NUMERIC
) RETURNS BOOLEAN AS $$
DECLARE
    v_reste NUMERIC;
    v_cloture BOOLEAN;
BEGIN
    SELECT reste, cloture INTO v_reste, v_cloture
    FROM dotation
    WHERE id = p_dotation_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    IF v_cloture = TRUE THEN
        RETURN FALSE;
    END IF;
    
    RETURN p_qte <= v_reste;
END;
$$ LANGUAGE plpgsql;

-- Function to get monthly consumption statistics
CREATE OR REPLACE FUNCTION get_monthly_stats(p_mois INTEGER, p_annee INTEGER)
RETURNS TABLE(
    type_approvi VARCHAR,
    nombre_appros BIGINT,
    total_litres NUMERIC,
    avg_qte NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.type_approvi,
        COUNT(*) AS nombre_appros,
        SUM(a.qte) AS total_litres,
        ROUND(AVG(a.qte), 2) AS avg_qte
    FROM approvisionnement a
    WHERE EXTRACT(MONTH FROM a.date) = p_mois
      AND EXTRACT(YEAR FROM a.date) = p_annee
    GROUP BY a.type_approvi;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE dotation IS 'Dotations mensuelles pour chaque véhicule';
COMMENT ON COLUMN dotation.reste IS 'Calculé automatiquement: qte - qte_consomme';
COMMENT ON COLUMN dotation.cloture IS 'TRUE si la dotation est épuisée ou expirée';

COMMENT ON TABLE approvisionnement IS 'Enregistre tous les approvisionnements (DOTATION et MISSION)';
COMMENT ON COLUMN approvisionnement.type_approvi IS 'DOTATION ou MISSION';
COMMENT ON COLUMN approvisionnement.dotation_id IS 'Obligatoire pour type_approvi = DOTATION';
COMMENT ON COLUMN approvisionnement.ordre_mission IS 'Obligatoire pour type_approvi = MISSION';
COMMENT ON COLUMN approvisionnement.vhc_provisoire IS 'Police du véhicule temporaire si différent du véhicule principal (pour DOTATION)';
COMMENT ON COLUMN approvisionnement.km_provisoire IS 'Kilométrage du véhicule temporaire (pour DOTATION)';
COMMENT ON COLUMN approvisionnement.police_vehicule IS 'Numéro de police du véhicule (pour MISSION)';
COMMENT ON COLUMN approvisionnement.observations IS 'Notes diverses, mentionner ici si véhicule provisoire utilisé';

COMMENT ON TRIGGER trg_update_qte_consomme ON approvisionnement IS 'Met à jour qte_consomme dans dotation après chaque approvisionnement';
COMMENT ON TRIGGER trg_check_close_dotation ON dotation IS 'Clôture automatiquement la dotation si reste <= 0';
COMMENT ON TRIGGER trg_update_vehicule_km ON approvisionnement IS 'Met à jour le kilométrage du véhicule principal (seulement si vhc_provisoire est NULL)';
COMMENT ON TRIGGER trg_check_dotation_status ON approvisionnement IS 'Vérifie que la dotation n''est pas clôturée et que la quantité est disponible';
COMMENT ON TRIGGER trg_close_previous_dotation ON dotation IS 'Clôture les dotations précédentes lors de la création d''une nouvelle';
COMMENT ON TRIGGER trg_validate_kilometrage ON approvisionnement IS 'Valide que km > km_precedent';

-- ============================================================================
-- SAMPLE DATA (for testing - remove in production)
-- ============================================================================

-- Insert sample users
INSERT INTO users (username, password, role) VALUES
('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ADMIN'), -- password: password
('agent1', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'AGENT');

-- Insert sample services
INSERT INTO service (nom, direction) VALUES
('SCL', 'DEB'),
('SAH', 'DRH'),
('SIT', 'DSIC');

-- Insert sample beneficiaires
INSERT INTO benificiaire (matricule, nom, fonction, service_id) VALUES
('B001', 'ALAMI Ahmed', 'Chef Service', 1),
('B002', 'BENNANI Fatima', 'Chef Division', 2),
('B003', 'TAZI Mohammed', 'Chef section', 3);

-- Insert sample vehicules
INSERT INTO vehicule (police, nCivil, marque, carburant, km) VALUES
('12345', '12345-E-21', 'Toyota Corolla', 'essence', 50000),
('45678', '67890-E-21', 'Renault Duster', 'gazoil', 75000),
('78901', '11111-E-22', 'Dacia Logan', 'essence', 30000);

-- Insert sample dotations for current month
INSERT INTO dotation (vehicule_id, benificiaire_id, mois, annee, qte) VALUES
(1, 1, EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, 120),
(2, 2, EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, 140),
(3, 3, EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, 120);

-- ============================================================================
-- TESTING QUERIES
-- ============================================================================

/*
-- Test 1: Create a DOTATION approvisionnement with main vehicle
INSERT INTO approvisionnement (type_approvi, qte, km_precedent, km, dotation_id, observations)
VALUES ('DOTATION', 30.50, 50000, 50250, 1, 'Approvisionnement normal');

-- Test 2: Create approvisionnement with TEMPORARY vehicle
INSERT INTO approvisionnement (
    type_approvi, qte, km_precedent, km, dotation_id,
    vhc_provisoire, km_provisoire, observations
)
VALUES (
    'DOTATION', 25.00, 15000, 15150, 1,
    'B-999-99', 15000, 'Véhicule principal en panne - utilisation véhicule provisoire B-999-99'
);

-- Test 3: Another appro with same temporary vehicle (continuing)
INSERT INTO approvisionnement (
    type_approvi, qte, km_precedent, km, dotation_id,
    vhc_provisoire, km_provisoire, observations
)
VALUES (
    'DOTATION', 20.00, 15150, 15300, 1,
    'B-999-99', 15000, 'Toujours avec véhicule provisoire B-999-99'
);

-- Test 4: Back to main vehicle (no vhc_provisoire)
INSERT INTO approvisionnement (type_approvi, qte, km_precedent, km, dotation_id, observations)
VALUES ('DOTATION', 35.00, 50250, 50450, 1, 'Retour au véhicule principal après réparation');

-- Test 5: View all approvisionnements showing which vehicle was used
SELECT 
    id, date, numero_bon, qte,
    COALESCE(vhc_provisoire, police) AS vehicule_utilise,
    km_precedent, km,
    observations
FROM v_appro_dotation
WHERE dotation_id = 1
ORDER BY date DESC;

-- Test 6: Check dotation status
SELECT * FROM v_dotation_status;

-- Test 7: Try to exceed dotation (should fail)
INSERT INTO approvisionnement (type_approvi, qte, km_precedent, km, dotation_id)
VALUES ('DOTATION', 200, 50250, 50500, 1);

-- Test 8: Create a MISSION approvisionnement
INSERT INTO approvisionnement (
    type_approvi, qte, km_precedent, km, 
    matricule_conducteur, service_externe, ville_origine, ordre_mission,
    police_vehicule, observations
)
VALUES (
    'MISSION', 45.00, 50000, 50200,
    'EXT-123', 'Service Externe Casablanca', 'Casablanca', 'OM-2025-001',
    'C-456-78', 'Mission inspection régionale'
);

-- Test 9: View all approvisionnements
SELECT * FROM v_appro_summary;

-- Test 10: Get monthly statistics
SELECT * FROM get_monthly_stats(
    EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER,
    EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
);

-- Test 11: Find all temporary vehicle usage
SELECT 
    date, numero_bon, police AS vehicule_principal,
    vhc_provisoire AS vehicule_provisoire_utilise,
    qte, observations
FROM v_appro_dotation
WHERE vhc_provisoire IS NOT NULL
ORDER BY date DESC;

-- Test 12: Check if can add more fuel
SELECT check_dotation_disponible(1, 50.00);

-- Test 13: Get current dotation for a vehicle
SELECT * FROM get_current_dotation(1);
*/

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================

INSERT INTO service (nom, direction) VALUES
('SCL', 'DSIC'),
('SAH', 'DRH'),
('SIT', 'DRH'),
('FIN', 'DRH'),
('LOG', 'DRH'),
('PAT', 'DRH'),
('JUR', 'DSIC'),
('INF', 'DSIC'),
('COM', 'DSIC'),
('ACH', 'DPJ'),
('RH1', 'DPJ'),
('RH2', 'DPJ'),
('CTRL', 'DPJ'),
('PLAN', 'DRG'),
('ETU', 'DRG'),
('TECH', 'DRG'),
('AUTO', 'DRG'),
('PARC', 'DEB'),
('MED', 'DEB'),
('SOC', 'DEB'),
('ENV', 'DEB'),
('QUAL', 'DSP'),
('AUD', 'DSP'),
('ARCH', 'DSP');


INSERT INTO benificiaire (matricule, nom, fonction, service_id) VALUES
('B100', 'EL AMRANI Youssef', 'Chef Service', 1),
('B101', 'BENALI Samira', 'Chef Division', 2),
('B102', 'TAHIRI Mohamed', 'Chef Section', 3),
('B103', 'EL IDRISSI Ahmed', 'Responsable', 4),
('B104', 'LAHCENI Fatima', 'Chef Service', 5),
('B105', 'OUAZZANI Karim', 'Chef Section', 6),
('B106', 'SAIDI Hassan', 'Responsable', 7),
('B107', 'BOUAZZA Imane', 'Chef Division', 8),
('B108', 'FARAH Nabil', 'Chef Service', 9),
('B109', 'KADIRI Salma', 'Chef Section', 10),
('B110', 'MAZOUZI Anas', 'Responsable', 11),
('B111', 'RAHMANI Khadija', 'Chef Division', 12),
('B112', 'CHERKAOUI Rachid', 'Chef Service', 13),
('B113', 'AMMOR Latifa', 'Chef Section', 14),
('B114', 'HADDAD Omar', 'Responsable', 15),
('B115', 'BERRADA Sanae', 'Chef Service', 16),
('B116', 'EL KHALFI Jamal', 'Chef Division', 17),
('B117', 'ZIANI Soukaina', 'Chef Section', 18),
('B118', 'NAJI Yassine', 'Responsable', 19),
('B119', 'AIT ALI Brahim', 'Chef Service', 20),
('B120', 'EL FASSI Hajar', 'Chef Division', 21),
('B121', 'MOKHTARI Adil', 'Chef Section', 22),
('B122', 'SBAI Rania', 'Responsable', 23),
('B123', 'LAMRANI Othmane', 'Chef Service', 24),
('B124', 'EL MAHJOUBI Ikram', 'Chef Division', 25);


INSERT INTO vehicule (police, nCivil, marque, carburant, km) VALUES
('P1001', '1001-E-2', 'Toyota Corolla', 'essence', 45000),
('P1002', '1002-E-1', 'Renault Duster', 'gazoil', 78000),
('P1003', '1003-E-2', 'Dacia Logan', 'essence', 52000),
('P1004', '1004-E-2', 'Hyundai Accent', 'essence', 61000),
('P1005', '1005-E-2', 'Peugeot 301', 'gazoil', 88000),
('P1006', '1006-E-1', 'Ford Ranger', 'gazoil', 99000),
('P1007', '1007-E-2', 'Skoda Octavia', 'essence', 43000),
('P1008', '1008-E-3', 'Nissan Qashqai', 'gazoil', 39000),
('P1009', '1009-E-1', 'Kia Rio', 'essence', 56000),
('P1010', '1010-E-2', 'VW Passat', 'gazoil', 102000),
('P1011', '1011-E-2', 'Toyota Hilux', 'gazoil', 87000),
('P1012', '1012-E-3', 'Suzuki Celerio', 'essence', 25000),
('P1013', '1013-E-1', 'Seat Ibiza', 'essence', 48000),
('P1014', '1014-E-2', 'Isuzu D-Max', 'gazoil', 115000),
('P1015', '1015-E-2', 'Fiat Tipo', 'essence', 53000),
('P1016', '1016-E-3', 'Hyundai Tucson', 'gazoil', 42000),
('P1017', '1017-E-1', 'Peugeot 208', 'essence', 60000),
('P1018', '1018-E-2', 'Renault Clio', 'essence', 47000),
('P1019', '1019-E-20', 'Toyota Prado', 'gazoil', 130000),
('P1020', '1020-E-23', 'MG ZS', 'essence', 18000),
('P1021', '1021-E-21', 'Citroen C-Elysee', 'gazoil', 76000),
('P1022', '1022-E-22', 'Opel Astra', 'essence', 54000),
('P1023', '1023-E-3', 'Chery Tiggo', 'essence', 22000),
('P1024', '1024-E-1', 'Mitsubishi L200', 'gazoil', 98000),
('P1025', '1025-E-2', 'Toyota Yaris', 'essence', 36000);


INSERT INTO dotation (vehicule_id, benificiaire_id, mois, annee, qte) VALUES

(6, 6, EXTRACT(MONTH FROM CURRENT_DATE), EXTRACT(YEAR FROM CURRENT_DATE), 140),

(10, 10, EXTRACT(MONTH FROM CURRENT_DATE), EXTRACT(YEAR FROM CURRENT_DATE), 140),
(11, 11, EXTRACT(MONTH FROM CURRENT_DATE), EXTRACT(YEAR FROM CURRENT_DATE), 140),
(12, 12, EXTRACT(MONTH FROM CURRENT_DATE), EXTRACT(YEAR FROM CURRENT_DATE), 120),
(13, 13, EXTRACT(MONTH FROM CURRENT_DATE), EXTRACT(YEAR FROM CURRENT_DATE), 120),

(16, 16, EXTRACT(MONTH FROM CURRENT_DATE), EXTRACT(YEAR FROM CURRENT_DATE), 140),
(17, 17, EXTRACT(MONTH FROM CURRENT_DATE), EXTRACT(YEAR FROM CURRENT_DATE), 120),
(18, 18, EXTRACT(MONTH FROM CURRENT_DATE), EXTRACT(YEAR FROM CURRENT_DATE), 120),
(19, 19, EXTRACT(MONTH FROM CURRENT_DATE), EXTRACT(YEAR FROM CURRENT_DATE), 140);
