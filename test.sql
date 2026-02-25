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
    n_order INTEGER,
    FOREIGN KEY (service_id) REFERENCES service(id) ON DELETE RESTRICT
);
CREATE OR REPLACE FUNCTION set_n_order_benificiaire()
RETURNS TRIGGER AS
$$
DECLARE
    v_direction TEXT;
    v_next_order INTEGER;
BEGIN
    -- Get direction of the service linked to the new beneficiary
    SELECT direction
    INTO v_direction
    FROM service
    WHERE id = NEW.service_id;

    -- Count existing beneficiaries in the same direction
    SELECT COUNT(*) + 1
    INTO v_next_order
    FROM benificiaire b
    JOIN service s ON s.id = b.service_id
    WHERE s.direction = v_direction;

    -- Assign value
    NEW.n_order := v_next_order;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_set_n_order
BEFORE INSERT ON benificiaire
FOR EACH ROW
EXECUTE FUNCTION set_n_order_benificiaire();
-- Vehicule Table
CREATE TABLE vehicule (
    id SERIAL PRIMARY KEY,
    police VARCHAR(20) NOT NULL UNIQUE,
    nCivil VARCHAR(30)  UNIQUE,
    marque VARCHAR(50),
    carburant VARCHAR(20) NOT NULL CHECK (carburant IN ('gasoil', 'essence')),
    km INTEGER CHECK (km >= 0),
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
    numordre INTEGER,
    UNIQUE (vehicule_id, mois, annee),
    FOREIGN KEY (benificiaire_id) REFERENCES benificiaire(id) ON DELETE RESTRICT,
    FOREIGN KEY (vehicule_id) REFERENCES vehicule(id) ON DELETE CASCADE
);
CREATE OR REPLACE FUNCTION set_numordre_dotation()
RETURNS TRIGGER AS
$$
DECLARE
    v_numordre_benef INT;
BEGIN
    -- Get NumOrdre from benificiaire
    SELECT numordre
    INTO v_numordre_benef
    FROM benificiaire
    WHERE id = NEW.benificiaire_id;

    -- Calculate value
    NEW.numordre := v_numordre_benef * NEW.mois;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_set_numordre_dotation
BEFORE INSERT OR UPDATE
ON dotation
FOR EACH ROW
EXECUTE FUNCTION set_numordre_dotation();
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
CREATE OR REPLACE FUNCTION update_vehicle_km()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.type_approvi = 'DOTATION' THEN
        -- Update KM via dotation_id → vehicule_id
        -- Only if no provisoire vehicle (provisoire doesn't update main vehicle KM)
        IF NEW.vhc_provisoire IS NULL THEN
            UPDATE vehicule
            SET km = NEW.km
            WHERE id = (
                SELECT vehicule_id
                FROM dotation
                WHERE id = NEW.dotation_id
            )
            AND NEW.km > km;  -- Only update if new KM is higher
        END IF;

    ELSIF NEW.type_approvi = 'MISSION' THEN
        -- Update KM via police_vehicule
        UPDATE vehicule
        SET km = NEW.km
        WHERE police = NEW.police_vehicule
        AND NEW.km > km;  -- Only update if new KM is higher
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trg_update_km_after_appro
AFTER INSERT ON approvisionnement
FOR EACH ROW
EXECUTE FUNCTION update_vehicle_km();

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
('CABINET', 'CABINET'),('PCD', 'CABINET'),('ISS', 'CABINET'),('PAD', 'CABINET'),('ROYAL', 'CABINET'),('TGR', 'CABINET'),('REVUE POLICE', 'CABINET'),('DRH', 'DRH'),('DRG', 'DRG'),
('DPJ', 'DPJ'),('DPC', 'DPJ'),('DSIC', 'DSIC'),('IG', 'IG'),('DSP', 'DSP'),('GMS99', 'DSP'),('DEB', 'DEB')?('DGP', 'DEB'),('DPA', 'DEB'),('DM', 'DEB'),('DF', 'DEB'),('SAA', 'DEB'),('SG', 'DEB'),
('DPA/FC', 'DEB'),('DM/MAG', 'DEB'),('DM/SAMS', 'DEB'),('FMSN', 'FMSN'),('PP LAAYOUNE', 'PP');

INSERT INTO benificiaire (matricule, nom, fonction, service_id)
SELECT NULL, v.nom, v.fonction, s.id
FROM (VALUES
('MME KARIMA BOUAZZA','CHEF DU SERVICE AUDIT ET PILOTAGE RATTACHE CABINET','DEB'),
('MR TARIK BOUTOUIL','CHEF DU SERVICE DES AFFAIRES ADMINISTRATIVES','DEB'),
('MR SAID AL MARCHOUM','CHEF DE LA SECTION CONTRÔLE  SURVEILLANCE DES TRAVAUX','DEB'),
('DISPOSITION DEB/SAP','CHEF DE LA SECTION PILOTAGE','DEB'),
('MME FADOUA EL HAMMA','CHEF DU SERVICE DE GESTION ET AMENAGEMENT DU PATRIMOINE IMMOBILIER','DEB'),
('MR SOUFIANE TAOUIL','CHEF DE LA DIVISION DE LA GESTION DU PATRIMOINE','DEB'),
('MR AMINE BOUFAR','CHEF DE LA SECTION FACTURATION ET BONS DE COMMANDE','DEB'),
('MR EL MAKHFI QUAZOUINI','CHEF DE LA SECTION ENGAGEMENT ET EMISSION','DEB'),
('MR ABDELLAH SASSI','CHEF SECRETARIAT DEB/DGP','DEB'),
('MR SAID AHNAIN','CHEF DE LA DIVISION DU PARC AUTO','DEB'),
('MR ABDELKADER BENABBOU','CHEF DE LA SECTION DES MISSIONS','DEB'),
('MR ABDELILAH MISSOUR','CHEF DE LA SECTION ENTRETIEN ET REPARATIONS SCES EXTERIEURS','DEB'),
('MR ABDELALI  EDRIEF','CHEF SECRETARIAT DEB/DPA','DEB'),
('MR AHMED SEMLALI','DISPOSITION DPA/SEC','DEB'),
('MR JAWAD BENABBAD','CHEF DE LA SECTION COMPTABILITE DES VIGNETTES VALEUR','DEB'),
('MR MOHAMMED EL OUARTI','CHEF DE LA SECTION MAGASIN PIECES AUTO','DEB'),
('MR MOURAD KHORCHA','CHEF DU SERVICE CARBURANT ET LUBRIFIANTS PI','DEB'),
('MR MOHAMMED EL MADBOUHI','CHEF DE LA SECTION DU PARC AUTOS DE RESERVE','DEB'),
('MR MUSTAPHA LAHMAM','CHEF DE LA SECTION GARAGE CENTRAL','DEB'),
('MR RABIE FAIK','CHEF DU SERVICE DES INDEMNITES','DEB'),
('MR MY RACHID ALAOUI','CHEF DU SERVICE MATERIEL ET MOBILIER BUREAU','DEB'),
('MR MBAREK ZERRAB','CHEF DU SERVICE D''ARMEMENT ET MATERIEL DE SECURITE','DEB'),
('MR SAID RAMI','CHEF DE LA SECTION MAGASIN D''HABILLEMENT','DEB'),
('MR BRAHIM NMISS','CHEF LA SECTION ARMURERIE CENTRAL','DEB'),
('MR HASSAN MEJLAL','RESPONSABLE DES MAGASINS FOURNITURES ET MOBILIER DE BUREAU','DEB'),
('MR JAMAL KABLI','CHEF SECRETARIAT DEB/DF','DEB'),
('MR ABDELHAQ MEHDI','CHEF DU SERVICE BUDGET','DEB'),
('MR BADR SBAI','CHEF DE LA DIVISION FINANCIERE','DEB'),
('MR HAMID KADANI','CHEF DE LA SECTION DES INDEMNITES SERVICE CENTRAL','DEB'),
('MREL ALAMI BOUHAMRA','CHEF DU SERVICE D''ORDONNANCEMENT P.I','DEB'),
('MOHAMMED LAIOUNI','CHEF DU SERVICE DE CONSTRUCTION P.I','DEB'),
('MR TARIK FALAKI','CHEF DE LA SECTION COMPTABILITE, SUIVI ET CONTRÔLE (REGIE)','DEB'),
('MR MAJID EL MAAQILI','REGISSEUR TITULAIRE DE LA DGSN','DEB'),
('MR MOHAMED AIT SOUDANE','CHEF DU SERVICE ENTRETIEN ET REPARATIONS','DEB'),
('MR MOHAMMED ABIDALLAH','CHEF DE LA SECTION ENTRETIEN EL LAVAGE','DEB'),
('MR MOHAMMED MBARKIOU','CHEF DE LA SECTION COMPTABILITE VIGNETTES VALEUR ENTRETIEN ET REPARATIONS','DEB'),
('MR HAMID MOUHSINE','CHEF DU SERVICE D''HABILLEMENT','DEB'),
('MR MUSTAPHA ABAYOUNES','CHEF DE LA SECTION TECHNIQUE ET MOYENS DE COMMUNICATION','DEB'),
('MR JAMAL EL OUAIMI','CHEF DE LA SECTION SUIVI ET CONTRÔLE DU CARBURANT','DEB'),
('MR YASSINE BENHAIMOUD','CHEF DU SERVICE DES ACHATS ET UTILISATION P.I','DEB'),
('DISP/REGIE','DEB/DF/S.REGIE','DEB'),
('MME KARIMA BEN BOUCHTA','CHEF LA SECTION SUIVI ET EXECUTION DU BUDGET','DEB'),
('MR ABDELRAZZAK HOUBAIDA','CHEF DE LA SECTION SOUTE D''APPROVISIONNEMENT EN CARBURANT','DEB'),
('MME ILHAM JAMAL','CHEF DU SERVICE ACHATS','DEB'),
('DISP/ DIV-MAT','DISP/DIV-MAT','DEB'),
('MR  ZAKARIA AISSAL','CHEF DE LA DIVISION DES MATERIELS','DEB'),
('MR MOHAMED NACHIT','CHEF LA SECTION ATELIER MECANIQUE','DEB'),
('MME AMIRA GHIZLANE','CHARGE DE LA SECTION DES MARCHES','DEB'),
('MR AHMED CHENNAR','CHEF DE LA SECTION ARMURERIE DU COMPLEXE','DEB'),
('MR NABIL AKRAT','CHEF SECRETARIAT DEB/DM','DEB'),
('MR AYOUB BICHRI','CHEF DE LA SECTION MAGASIN DES PIECES MOTOS','DEB'),
('SERVICE GENERAL','DISPOSITION SERVICE GENERAL','DEB'),
('DISP/REGIE','DISPOSITION DEB/DF/S.REGIE','DEB'),
('SERVICE ORDONNANCEMENT','DISPOSITION DEB/DF/S.ORDONNANCEMENT','DEB'),
('MR YACINE ALOUANI','CHEF DE LA SECTION INFORMATIQUE','DEB'),
('MR ABDELALI EL GOUFFI','DISPOSITION DEB/SEC','DEB'),
('MR ABDELKADER EZZAHIR','DISPOSITION DEB/DF/SEC','DEB'),
('MR EZZARRADI MEKKI','CHEF DE LA SECTION VIDANGE ET PNEUMATIQUES','DEB'),
('MME MARWA BENSIAD','CHEF DE LA SERVICE DES ETUDES TECHNIQUE','DEB'),
('MR MOHAMMED AHARABI','CHEF DE LA SECTION FICHIER CENTRAL','DEB'),
('MR ATIF RAISSOUNI','CHEF DE LA SECTION DES ACCIDENTS','DEB'),
('MME AMINA CHLIH','CHEF DE LA SECTION ENTRETIEN ET REPARATION SERVICE CENTRAL','DEB'),
('MR TAHA SERRAR','CHEF DE LA SECTION DES INDEMINITES SERVICE EXTERIEUR','DEB'),
('MR ABDELAZIZ ANDALOUSSI','CHEF DE LA SECTION DES FRAIS D''ENQUETE SERVICE EXTERIEUR','DEB'),
('MR OTMAN EL ASSRAOUI','CHEF DE LA SECTION FACTURATION ET BONS DE COMMANDES','DEB'),
('MME KARIMA DAHBI','CHEFFE DE LA SECTION EAU-CHAUFFAGE ET ELECTRICITE','DEB'),
('DISPOSITION MAGASIN PIECES AUTOS','DISPOSITION MAGASIN PIECES AUTOS','DEB'),
('MR DRISS OULED ZAHRA','CHEF DE LA SECTION CONTRÔLE ET SURVEILLANCE DES TRAVAUX','DEB'),
('MR NABIL AMRHARI','DEB/DPA/SECTION DES MOTOS','DPA'),
('MR ABDELKADER JAOUI','DISP DEB/DGP','DGP'),
('MAGASIN PIECES MOTOS','DISP.SECTION MAGASIN PIECES AUTOS','DPA'),
('MR RACHID BECHNIKHA','DISP.MAGASINS FOURNITURES ET MOBILIER DE BUREAU','DM'),
('MR NOUREDDINE OUAJID','DISP.DEB.SAA','SG'),
('MR RAFIQ BAHOUM','DISP.DEB/DGP','DGP'),
('MR FOUAD LAHRICHI','DISP.DEB/S.A.A','SAA'),
('MR FOUAD LAHRICHI','DISP.DEB/S.A.A','SAA'),
('MR MOHAMMED EL FATTAHI','DISP.DEB/DGP/SEC','DGP'),
('MR AHMED LIMOURATE','DISP.DEB/DPA/SECTION FICHIER CENTRAL','DEB'),
('DEB/SG (PORTE PRINCIPAL DEB)','DISP.DEB/SG (PORTE PRINCIPAL DEB)','SG'),
('MR NOUREDDINE DOUIRMI','DISP.DEB/DGP/SG','DGP'),
('MR MEKKAOUI EZZOUBAYR','DISP.DEB/DGP/SG','SAA'),
('SERVICE GENERAL SACO','DISP.DEB/SG/SACO','DEB'),
('MR REDA GARDY','DISP DEB/DPA/SCL/SSC','DEB'),
('MR MED AMINE ADLAOUI','DISP DEB/DM/SEC','DEB'),
('MR HICHAM AGUIDA','DISP.DEB/DPA/SECTION FICHIER CENTRAL','DEB'),
('MR AHMED JEDDI','DISP CABINET','DPA/FC'),
('MR FOUAD EL BILALI','DISP.MAGASINS FOURNITURES ET MOBILIER DE BUREAU','DM/MAG'),
('MR ABDESSALAM BELMOKHTAR','DISP.DEB/DM/SAMS','DM/SAMS')
) AS v(nom, fonction, service_nom)
JOIN service s ON s.nom = v.service_nom;


--CABINET
INSERT INTO benificiaire (nom, fonction, service_id) VALUES
('MR ABDELLAH AAMOUD', 'CABINET ROYAL', 69),
('MR MUSTAPHA GHANIMI', 'CABINET ROYAL', 69),
('MR HAMID ARFAOUI', 'CABINET ROYAL', 69),
('SALAH EDDINE BOUMRAH', 'L''INSPCTEUR DES SERVICES DE SANTE', 65),
('MR RACHID JARARE', 'CABINET ROYAL', 69),
('MR BENSABER EL RHAZOUANI', 'CHEF POSTE DE COMMANDEMANT DIRECTORIAL', 66),
('MR NAJIB CHRIETTE', 'INSPECTION DES SERVICES DE SANTE', 67),
('MR MOHAMED MOUTAKIL', 'CABINET DIRECTORIAL', 65),
('MR ABDELKBIR NACHIT', 'DISPOSITION L''EX DGSN MR BENHACHEM', 68),
('MR HATIM MABROUK', 'DISPOSITION CED', 70),
('MR AHMED BILADI', 'DISPOSITION CABINET ROYAL', 69),
('DISP CED (BENMOUSSA)', 'DISPOSITION CED', 70),
('MR BOUBKER SABIK', 'LA CELLULE CENTRALE DE COMMUNICATION', 65),
('MR ABDELKRIM BROUZI', 'BUREAU D''ORDRE CENTRAL', 65),
('MR RIDA CHBOUH', 'ASSISTANT DU LA CELLULE CENTRALE DE LA COMMUNICATION', 65),
('DL MR MANSOURI', 'DISP MR LE COORDONATEUR DE L''ENSEMBLE DES STRUCTURES DE LA SURETE NATIONALE', 65),
('DISP/ ISS', 'DISPOSITION CABINET/ISS', 65),
('MME HIND HANI', 'LA COLLABORATRICE DE MR LE COORDONATEUR DES STRUCURES S.N', 65),
('DISP MR COORDONATEUR', 'DISP MR LE COORDONATEUR DE L''ENSEMBLE DES STRUCTURES DE LA SURETE NATIONALE', 65),
('MME MARIA BENKHADRA', 'POLE DE LA COOPERATION POLICIERE INTERNATIONALE', 65),
('MME AMAL BERKIA', 'REVUE DE POLICE', 71),
('CABINET/ISS', 'DISPOSITION CABINET/ISS', 67),
('MR ABDERRAHIN LOUAI', 'PRESIDENT DE LA COMMISSION CENTRALE DES DOLEANCES', 65),
('AHMED EL MAHFOUDI', 'L''UNITE DE LA DOCUMENTATION CENTRALE ET DE L''INFORMATION', 65),
('AHMED BENCHRIH', 'CHEF SECRETARIAT DU CABINET DIRECTORIAL', 65),
('DISP CABINET (MR CORDONATEUR)', 'DISP MR LE COORDONATEUR DE L''ENSEMBLE DES STRUCTURES DE LA SURETE NATIONALE', 65),
('DOMICILE CHEF CABINET', 'DISPOSITION MR LE CABINET', 65),
('REVUE DE POLICE', 'REVUE POLICE', 65),
('DISP CAB/ISS', 'DISP CAB/ISS', 67),
('DISP CAB/ISS', 'DISP CAB/ISS', 67),
('MME ZAYNAB BOUZIANE', 'SERVICE DE LA SANTE AU TRAVAIL ET DES AFFAIRES REGLEMENTAIRES', 67),
('MR IMAD FARESS', 'SERVICE DE GESTION DES DOSSIERS DE SANTE', 67),
('MR MOURAD BOUJOUAL', 'SERVICE DES PRESTATIONS MEDICALES', 67),
('MR ABDERRAHMANE LAGHMARI', 'DISPOSITION L''EX DGSN MR MIDAOUI', 67),
('MR AMINE KOURAOUI', 'CHEF POLE IG/RH', 65),
('MR ZOUHAIR ZIDAN', 'L''INTERIMAIRE DE LA RESPONSABLE DU POLE DE COOPERATION POLICIERE INTERNATIONALE', 65),
('MR HICHAM LACHEBAH', 'DGSN/CABINET', 65),
('MR MOHAMMED ABOUWAFI', 'DISP.DGSN/CABINET', 65),
('MR AMINE ZKIK', 'DISP.DGSN/CABINET', 65),
('DISP.CABINET/ISS', 'DISP.CABINET/ISS', 67),
('MR AHMED HISNI', 'DISP. CABINET', 65),
('MR KHALID OUAHBI', 'DISP.DGSN/CABINET', 65),
('DISP.CABINET/ISS', 'DISP.CABINET/ISS', 67),
('MR DRISS HJAOUA', 'DISP.DGSN/CABINET', 65);

--DRH
INSERT INTO benificiaire (nom, fonction, service_id) VALUES
('MR MUSTAPHA EL HADDAD', 'CHEF DU SERVICE RENFORTS ET MISSIONS', 72),
('MR ROCHDI ASBAYTI', 'CHEF DELA DIVISION DES ETUDES ET AFFAIRES JURIDIQUES', 72),
('DISP DRH-DAS', 'DISPOSITION SFSN', 72),
('MR AZIZ ALAMI', 'CHEF DE LA DIVISION GESTION ADMINISTRATIVE', 72),
('DISP DRH-SEC', 'DISPOSITION DRH/SEC', 72),
('MR MOHAMMED AMIR', 'CHEF DU SERVICE RECRUTEMENT', 72),
('MR LAHOUCINE CHAMOU', 'CHEF DU SERVICE CONGES', 72),
('DISP/ SEC', 'DIVISION DES ETUDES ET DES AFFAIRES JURIDIQUES', 72),
('MR DAOUD AIT JA', 'CHEF DE LA DIVISION DISCIPLINE', 72),
('MME HANAN EL MAATAOUI', 'DISP DRH/SEC', 72),
('DISP/DRH-SEC', 'DISPOSITION MR LE DRH', 72),
('MR YASSINE TIGHANIMINE', 'CHEF DE LA DIVISION EFFECTIFS ET AVANCEMENT', 72),
('MR HICHAM TAOUIL', 'CHEF DU SERVICE JURIDIQUE', 72),
('MR M''HAMED FRAKCHI', 'CHEF DE LA DIVISION INDISPONIBILITE', 72),
('MR ANAS MOUMSEK', 'CHEF DE LA DIVISION RECRUTEMENT ET CONCOURS', 72),
('MR HAMID GARAH', 'CHEF DU SERVICE CONSEILS DE DISCIPLINE', 72),
('MR MOHAMED BELATIK', 'CHEF DU SERVICE ETAT CIVIL', 72),
('MR NABIL RACHDI', 'CHEF DU SERVICE MOBILITE', 72),
('MR BASSIM LOUGRAINI MOHAMMED', 'CHEF DU SERVICE DES AFFAIRES DISCIPLINAIRES', 72),
('MR JAMAL BOULYALI', 'CHEF DU SERVICE CONCOURS', 72),
('MR MOHAMED HAMZA BERTIAA', 'CHEF DU SERVICE GESTION PREVISIONNELLE DES EMPLOIS ET COMPETENCES', 72),
('MR YOUNESS LAAROUSSI', 'CHEF DU SERVICE D''AVANCEMENT', 72),
('MME KAWTAR EL OMARI', 'CHEF DU SERVICE EFFECTIFS', 72),
('MR ABDELHAKIM ASSIM', 'CHEF DU SERVICE ACCUEIL ET ASSISTANCE', 72),
('MR BADRANE DAOUDI', 'CHEF DU SERVICE PENSIONS', 72),
('MR KABBOUR ESSAADANI', 'CHEF DU SERVICE CONTENTIEUX', 72),
('MR YASSIR EL KANDILI', 'CHEF DU SERVICE DES POURSUITES JUDICIAIRES', 72),
('DISP FRAT', 'DISPOSITION SFSN', 72);

--DRG
INSERT INTO benificiaire (nom, fonction, service_id) VALUES
('MR MUSTPHA CHETOUI', 'SECRETARIAT DRG', 73),
('MR ADNANE DRAIS', 'CHEF DE LA DIVISION DES RENSEIGNEMENTS ET DE LA SECURITE', 73),
('MR SOUFIANE BENCHEIKH', 'CHARGE DE LA DIVISION DE LA REGLEMENTATION', 73),
('MR ABDELILAH MISSIOUI', 'CHEF DU SERVICE DE LA DOCUMENTATION GENERALE', 73),
('MR CHOUAIB JNAH', 'CHEF DU SERVICE DES FRONTIERES MARITIMES ET TERRESTRES', 73),
('MR MHAMED GHOUGHOU', 'CHEF DU SERVICE DES ACTIVITES REGLEMENTEES', 73),
('MR MED SAID EL KHARRAZ', 'CHEF DU SERVICE GESTION COMPTABILITE ET CONTROLE DESERVICES REGIONAUX', 73),
('MR MOHAMMED BAAZIZI', 'CHEF DE LA DIVISION DES AFFAIRES GENERALES', 73),
('MR YOUNES ZAIRIG', 'CHEF DU SERVICE DES ORGANISATIONS POLITIQUES ET SYNDICALES', 73),
('MR HAMID EL BINANI', 'CHEF DU SERVICE D''ENSEIGNEMENT', 73),
('MR MOHAMED KARIM LAKIAMI', 'CHEF DU SERVICE DE LA MIGRATION', 73),
('MR TAOUFIK EL HASNI', 'CHEF DU SERVICE DE LA LUTTE CONTRE LE SEPARATISME', 73),
('MR ABDELLAH MOUKHLISS', 'CHEF DU SERVICE DES ENQUETES SPECIALES', 73),
('MR MOHAMED EL GADAR', 'CHEF DU SERVICE DES ORGANISATIONS MARGINALES ET ACTIVITES ASSOCIATIVES', 73),
('MR DRISS RACHIDI', 'CHEF DE LA DIVISION DES ENQUETES DE SECURITE', 73),
('DIVISION GESTION DES DONNES DEM', 'DIVISION DE GESTION DES DONNES DEMOGRAPHIQUES', 73),
('MR ANIS CHADLI', 'CHEF DE LA DIVISION DE LA POLICE DES POSTES FRONTIERS', 73),
('MME NADIA ECHCHELH', 'CHEF DU SERVICE DE LA POLICE AEROPORTUAIRE', 73),
('MME NISRINE DOUDICH', 'CHEF DU SERVICE SUPPORT INFORMATIONNEL', 73),
('MME MOUNIA ZL YAAGOUBI', 'CHEF DU SERVICE NUMERISATION DES EMPREINTES DIGITALES ET PALMAIRES', 73),
('MR MOHAMMED EL ADNANI', 'CHEF DU SERVICE GESTION DES DONNEES', 73),
('MR MOULAY EL HASSAN TAKI', 'CHEF DU SERVICE DE LA GESTION DES POSTES FRONTIERES', 73),
('MME BOUTAINA EL ALAOUI', 'CHEF DU SERVICE ETUDE', 73),
('MME NARJIS MACHRAA', 'CHEF DU SERVICE DES AFFAIRES GENERALES', 73),
('MR KHALID BENMANSOUR', 'CHEF SERVICE GESTION DES FICHES DES EMPREINTES', 73),
('MME LOUBNA FOUINNA', 'CHEF DU SERVICE GESTION CNIE DES M.R.E', 73),
('MR MOHAMMED LAROUSSI', 'CHEF DU SERVICE VALIDATION DES DONNEES BIOMETRIQUES ET TRAITEMENT DU CONTENTIEUX', 73),
('MR MUSTAPHA KAMLI', 'CHEF DU SERVICE PRESSE', 73),
('MR ABDELKRIM EL BRINI', 'CHEF DU SERVICE DES ENQUETES DE SECURITE', 73),
('MR HICHAM HOUARI', 'CHEF DU SERVICE DE L''ISLAMISME RADICAL ET DE LA MOUVANCE ISLAMISTE RITUALISTE', 73),
('MR ABDERRAHIM CHAWKI', 'DISPOSITION DRG', 73),
('MR NOUREDDINE JABRANE', 'CHEF DE LA DIVISION D''ETUDE ET D''ANALYSE ET ADJOINT DE MR LE DRG', 73),
('MR MOHAMED LARAICHI', 'CHEF DU SERVICE DE SEJOUR ET VISAS', 73);

--DSIC
INSERT INTO benificiaire (nom, fonction, service_id) VALUES
('MR MOHAMMED SAKHI', 'CHEF SECRETARIAT DSIC', 76),
('MR ISMAIL KEDIDAR', 'CHEF DE LA DIVISION ETUDES ET DEVELOPPEMENT', 76),
('MR MOUHSSINE BENCHAABANE', 'CHEF UNITE CENTRALE TECHNIQUE', 76),
('DISP. MR LE DIRECTEUR', 'DISP. MR LE DSIC', 76),
('MR ABDELOUAHAD CHOUKHAIRI', 'DIVISION DES TELECOMMUNICATIONS ET DU RESEAUX NUMERIQUE', 76),
('MR HASSAN IDOUAARAB', 'CHEF DU SERVCE DEPLOIEMENT ET GESTION DU PARC INFORMATIQUE', 76),
('MR HOUSSAM KETANI IDRISSI', 'CHEF DU SERVICE DEPLOIEMENT ET GESTION DU PARC INFORMATIQUE', 76),
('MR MOURAD REGRAG', 'CHEF DE LA DIVISION DEPLOIEMENT ET SECURITE', 76),
('MR ABDELHAKIM QARTIT', 'CHEF DE LA DIVISION RADIO COMMUNICATION', 76),
('MR MOURAD CHERKAOUI', 'CHEF DE LA DIVISION VIDEO ET PROTECTION', 76),
('MR RACHID NAIT BAKOU', 'CHEF DE LA DIVISION RESEAUX ET TELECOM', 76),
('MME SALWA JMILA', 'RESPONSABLE DE LA COORDINATION ET SUIVI DE PROJETS', 76),
('MR SALAH SAYDI', 'CHE DU SERVICE BASE DE DONNEES ET EXPLOITATION', 76),
('MR ABDELHAMID EL BIYAALI', 'CHEF DU SERVICE PRODUCTION DES TITRES IDENTITAIRES', 76),
('MR ABDELKRIM EL OUERDIGHI', 'CHEF DU SERVICE ETUDE ET DEVELOPPEMENT', 76),
('MR RACHID BEN AZZA', 'CHEF DU SERVICE CONTROLE QUALITE, INTEGRATION ET FORMATION', 76),
('MR MOHAMED EL AMINE OUACHI', 'CHEF DU SERVICE INFRASTRUCTURE APPLICATIVE ET SYSTEMES D''ECHANGES', 76),
('MR YOUNESS KERBID', 'CHEF DU SERVICE VEILLE DE LOGICIELS ET METHODOLOGIE', 76),
('MME ASMAE AL DALIL', 'CHEF DU SERVICE ETUDE ET ADMINISTRATION', 76),
('MR AHMED BOUTAHRI', 'CHEF DU SERVCE DEPLOIEMENT ET MAINTENANCE (DRT)', 76),
('MR ABDELHAKIM HAMDAOUI', 'CHEF DU SERVICE EXPLOITATION DES SYSTEMES DE COMMUNICATION', 76),
('MR HICHAM BELHADI', 'CHEF DU SERVICE SUPERVISION DE L''INFRASTRUCTURE DU RESEAU', 76),
('MME LAMIAA MAJDY', 'CHEF DU SERVICE INGENIERIE ET OPTIMISATION', 76),
('MR TAOUFIK BENYETHO', 'CHEF DU SERVICE DEPLOIEMENT ET MAINTENANCE (DR)', 76),
('MR MOHAMED EL MISSAOUI', 'CHEF DU SERVICE GESTION DU PARC RADIO', 76),
('MME SALMA KAMAOUI', 'CHEF DU SERVICE ETUDE ET PLANIFICATION', 76),
('MR MOHAMED EL MEHDI ABBOUBI', 'CHEF DU SERVCE DEPLOIEMENT ET ADMINISTRATION', 76),
('MR MOHAMED ARHOUNI', 'CHEF DU SERVCE SECURITE DES SYSTEMES', 76),
('MR NABIL AMINE LAHLOU', 'CHEF DU SERVICE ENVIRONNEMENT TECHNIQUE ET HELP DESK', 76),
('MR MOUHCINE YEJJOU', 'CHEF DU PROJET CNIE 2', 76),
('MME BTISSAM BELLAKHDER', 'CHEF DU SERVICE SYSTEME', 76),
('MR NABIL EL GHISSARI', 'CHEF DU SERVICE EXPLOITATION DES INFRASTRUCTURES', 76),
('MR TAOUFIK BELYMAM', 'CHEF DE LA CELLULE MISSION SPECIALE', 76),
('MR MOHAMMED FAYLALI', 'CHEF DU SERVICE SUIVI ET MAINTENANCE', 76),
('MR RACHID EJJHAOUI', 'CHEF DE L''UNITE OPERATIONNELLE ET SECURITE', 76),
('MR TARIK BOUHASSE', 'CHEF DE LA CELLULE INFORMATISATION DES APPLICATIONS RELEVANT DE LA DRH', 76);

--DSP
INSERT INTO benificiaire (nom, fonction, service_id) VALUES
('MR MOHAMMED EL BOUNI', 'CHEF DE LA DIVISION DES UNITES DE MAINTIEN DE L''ORDRE', 78),
('DISP DSP/SEC', 'DISP DSP/SEC', 78),
('MR JAMAL JAIT', 'CHEF DU SERVICE DES ETUDES AUDIO VISUELLES', 78),
('MR MOHAMMED EL HAKOUR', 'CHEF DE LA DIVISION DE LA CIRCULATION ET DE LA SECURITE ROUTIERE', 78),
('MR MUSTAPHA HADDAOUI', 'CHEF DE LA DIVISION DE LA POLICE URBAINE', 78),
('MR YASSINE LYAAKOUBI', 'DE LA DIVISION DES VOYAGES OFFICIELS ET DE LA PROTECTION RAPPROCHEE', 78),
('MR DRISS SALEK', 'CHEF DU SERVICE DE LA SECURITE ROUTIERE ET ACCIDENTS', 78),
('DOMICILE MR LE DSP', 'DISPOSITION MR LE DSP', 78),
('DIRECTION DE LA SECURITE PUBLIQUE', 'DISPOSITION LA DSP', 78),
('MR MUSTAPHA EDDEHANE', 'CHEF DU POSTE DE COMMANDEMENT DE LA DSP', 78),
('MR ABDELGHANI KHALDI', 'CHEF DU SERVICE DE LA GESTION DES RESSOURCES', 78),
('MR HAMID MOUTAA', 'CHEF DU SERVICE DE LA GESTION ADMINISTRATIVE ET FINANCIERE', 78),
('MR AMINE KERKAB', 'CHEF DU GROUPE DE PROTECTION DE LA DGSN ET SES ANNEXES', 78),
('MR HICHAM BOUTEMRA', 'CHEF DU SERVICE ADMINISTRATIF', 78),
('MR SALAH NAIT-AHMED', 'CDT GMS99', 79),
('MR HASSAN EL BOUZIDI', 'DE LA DIVISION DE LA SECURITE SPORTIVE', 78),
('MR OMAR BEN SAGHIR', 'CHEF DU SERVICE DES STRUCTURES TERRITORIALES', 78),
('MR MOHAMED MRABET', 'CHEF LA DIVISION DES DOSSIERS ET ETUDES AUDIO-VISUELLES', 78),
('MR MEHDI ABDERRAFI', 'CHEF DU SERVICE DE LA GESTION ET DES MOYENS LOGISTIQUES', 78),
('ME ALAE EDDINE BENCHAKROUN', 'CHEF DU SERVICE DE LA PROTECTION RAPPROCHEE', 78),
('MR ZAKARIA HEJAJ', 'CHEF DU SERVICE DU CORPS URBAIN', 78),
('MR KHALID MARZOUK', 'COMMANDANT P.M.R', 78),
('MR AHMED EL KAHLAOUI', 'DISPOSITION DSP/DUMO/SL', 78),
('MR JALAL AZZOUZI', 'CHEF DU SERVICE CENTRAL DES GROUPES D''INTERVENTION', 78),
('MR MOHCIN BENHABBOUL', 'CHEF DU SERVICE D''ETUDE ET EVALUATION', 78),
('MR AHMED JEBRANE', 'CHEF DU SERVICE DE PROTECTION DES SITES ET DES INFRASTRUCTURES', 78),
('MR ABDELILAH BENDIB', 'CHEF DU SERVICE DE LA FORMATION CONTINUE', 78),
('MR MOHAMMED EL AMRAOUI', 'CHEF DU SERVICE DE LOGISTIQUE', 78),
('MR RACHID BRIKATE', 'CHEF DU SERVICE DE LA POLICE SPECIALISEE', 78),
('MR NAOUFAL OUAHABI', 'CHEF DU SERVICE CENTRAL DES ARTIFICIERS', 78),
('MR EL MEHDI KARKAS', 'CHEF DU SERVICE DES BRIGADES TOURISTIQUES', 78),
('MR HAMID EL JOHRI', 'CHEF DE L''UNITE MOBILE DE RESTAURATION', 78),
('MR OMAR RHEBALOU', 'DISPOSITION DSP/DUMO/SL', 78),
('MME LOUBNA DAIDAI', 'CHEFFE DU SERVICE REGLEMENTATION ET GESTION DES UNITES DE LA CIRCULATION', 78),
('MR HICHAM AIT HAMOU', 'CHEF DU SERVICE INFORMATION, ORIENTATION ET SUIVI', 78),
('MR ABDELLAH NOUHI', 'ADJOINT AU COMMANDANT DU GROUPEMENT MOBILE DE SECURITE', 79),
('MME IKRAM KOUHHIZ', 'CHEFFE DU SERVICE DU SYSTEME DE GESTION DES ARRONDISSEMENTS DE POLICE', 78),
('DISP DSP/SEC', 'DISPOSITION DSP/SEC', 78),
('TRAIN AUTO GMS99', 'DISP.DSP/GMS99/TA', 78);

INSERT INTO benificiaire (nom, fonction, service_id) VALUES
('MR ABDERRAFIE MNAOURI', 'CHEF DE LA DIVISION DES ENQUETES ADMINISTRATIVES ET TRAITEMENT DES RECLAMATIONS ET PLAINTES', 77),
('MR MOHAMMED LABIED', 'CHEF DE LA DIVISION DE CONTROLE, ETUDES ET AUDIT', 77),
('MR KARIM EDDINE BELKHAIR', 'CHEF DU SERVICE TRAITEMENTS DES RECLAMATIONS ET PLAINTES', 77),
('MR ABDELLAH MESSAOUDI', 'CHEF SECRETARIAT OPERATIONNEL', 77),
('DGSN/IG', 'DISPOSITION IG/SEC', 77),
('MR YASSIR EL MOUNIR', 'CHEF DU SERVICE DES ETUDES ET AUDIT', 77),
('MR ANOUAR KOBEIS', 'CHEF DU SERVICE CONTROLE', 77),
('DOM, MR DIRECTEUR', 'DISPOSITION MR L''IG', 77),
('MR OULAMINE SOULEIMANE', 'CHEF DU SERVICE DES ENQUETES', 77),
('MR MOUNIR RAMI', 'CHEF DE LA DIVISION DE LA SECURITE DES SYSTEMES D''INFORMATION', 77),
('MR KHALID AZZOUZI', 'CHEF DU SERVICE ETUDES ET STRATEGIE', 77),
('MR MOHAMED BATTI', 'CHEF DU SERVICE ADMINISTRATIF', 77),
('MME KAOUTAR KOSTIT', 'CHEF DU SERVICE EXPLOITATION ET CONSEIL', 77),
('MR SAID LAGHRISSI', 'DISPOSITION DGSN/IG', 77),
('MR TAOUFIK SITRI', 'DISPOSITION FMSN', 90),
('DISPOSITION FMSN', 'DISPOSITION FMSN', 90),
('DISPOSITION FMSN', 'DISPOSITION FMSN', 90),
('DISPOSITION FMSN', 'DISPOSITION FMSN', 90),
('CONVOYEUR PP LAAYOUNE N° 1', 'CONVOYEUR PP LAAYOUNE (1)', 91),
('MR IMAD BENABDELOUHAD', 'DISP.FMSN', 90),
('MR MOURAD QAOUTI', 'DISP.FMSN', 90);

--DPJ
INSERT INTO benificiaire (nom, fonction, service_id) VALUES
('MR MOHAMMED BERRADA', 'CHEF DE LA DIVISION DES AFFAIRES PENALES', 10),
('MR ADAM DIDOUH', 'CHEF DU SERVICE DE L''ANALYSE CRIMINELLE OPERATIONNELLE', 10),
('MR JAMAL KRIMATE', 'CHEF DE LA DIVISION DE LUTTE CONTRE LA CRIMINALITE FINANCIERE ET ECONOMIQUE', 10),
('MR ABDERRAFIE HASSANI', 'CHEF DU SERVICE DE SUIVI ET DE COORDINATION', 10),
('MR TAOUFIQ SAYEGH', 'CHEF DE L''INSTITUT DES SCIENCES FORENSIQUES DE LA SURETE NATIONALE', 10),
('MR ABDERRAHMANE EL YOUSSFI', 'CHEF DE LA DIVISION TECHNIQUE ET MANAGEMENT DES RISQUES', 10),
('MR AHMED AIT TALEB', 'CHEF DE LA DIVISION DES STATISTIQUES ET ANALYSE CRIMINELLE', 10),
('MR RACHID DAHANI', 'CHEF DE LA DIVISION DE LA POLICE CYNOTECHNIQUE', 10),
('DOMICILE MR DPJ', 'DISPOSITION MR LE DPJ', 10),
('MR RADOUANE RHAZAL', 'CHEF DU SERVICE DES STATISTIQUES ET ANALYSES STRATEGIQUE', 10),
('MR ABDE ESSLAM BENALI', 'CHEF DU SERVICE DE LUTTE CONTRE LA MIGRATION IRREGULIERE', 10),
('MR KHALID EL BAZI', 'CHEF DU SERVICE DE DIFFUSION ET ANIMATION DES RECHERCHES', 10),
('MR MUSTAPHA HAJJAM', 'CHEF DU BUREAU CENTRAL NATIONAL', 10),
('MR ABDERRAHIME HABIB', 'CHEF DE LA DIVISION DE LUTTE CONTRE LA CRIMINALITE TRANSNATIONALE', 10),
('MME ROKIA GHCHIME', 'CHEF DU SERVICE MANAGEMENT DES RISQUES', 10),
('DISP.SEC', 'DISPOSITION DPJ', 10),
('MME LAYLA EZZOUINE', 'CHEF DU SERVICE NUMERIQUE FORENSIQUE ET IMAGERIE', 10),
('MME MERIAMA LARAKI', 'CHEF DU SERVICE DES AFFAIRES PORTANT ATTEINTE A LA FAMILLE ET A LA MORALITE PUBLIQUE', 10),
('MME DOUNIA MADHY', 'CHEF DU SERVICE DU SUIVI ET DE L''EVALUATION DE LA COOPERATION', 10),
('MR HOUSINE EL MESTARI', 'CHEF DU SERVICE DE LUTTE CONTRE LE TERRORISME', 10),
('MME SARA BAZZAZI', 'CHEF DU SERVICE DES ETUDES', 10),
('MR MOHAMMED BENCHAFFI', 'CHEF DU BUREAU DE LIAISON ARABE', 10),
('MR MOHAMED EL MACHICHI', 'CHEF DU SERVICE POSTE DE COMMANDEMENT', 10),
('MR RACHID BELGHITI ALAOUI', 'CHEF DE LA DIVISION CENTRALE DE L''IDENTITE JUDICIAIRE', 10),
('MR ANASS BEN AZZOUZ', 'CHEF DU SERVICE DE LUTTE CONTRE LA CRIMINALITE ECONOMIQUE', 10),
('MR ADIL ADKHIS', 'CHEF DU SERVICE DES AFFAIRES PORTANT ATTEINTE AUX BIENS', 10),
('MR MEDLIASS BELLAMLIH', 'CHEF DU SERVICE DE LA SANTE VETERINAIRE', 10),
('MR ABDELAZIZ FDAIL', 'CHEF DU SERVICE ANTECEDENTS JUDICIAIRE ET ALIMENTATION', 10),
('ME MUSTAPHA CHOUAOUTI', 'CHEF DU SERVICE DE LA FORMATION CYNOTECHNIQUE', 11),
('MR OTHMAN CHERKAOUI', 'CHEF DU SERVICE DE LA LUTTE CONTRE LA CRIMINALITE FINANCIERE', 10),
('MR HICHAM YACINE', 'CHEF DU SERVICE IDENTIFICATION BIOMETRIQUE', 10),
('MR FAHD MARZOUKI', 'CHEF DU SERVICE EXPERTISE BALISTIQUE', 10),
('MME ASMAE ANNA', 'CHEF DU SERVICE FAUX DOCUMENT', 10),
('MR MUSTAPHA CHADDAD', 'CHEF DU SERVICE DE LUTTE CONTRE LE BLANCHIMENT DE CAPITAUX', 10),
('MR RACHID ZARKI', 'CHEF DU SERVICE DEVELOPPEMENT DES COMPETENCES ET RECHERCHESCIENTIFIQUE', 10),
('MR ABDELLAH KAFHAMAM', 'CHEF DU SERVICE DE LUTTE CONTRE LE FAUX MONNAYAGE ET CRIMES LIES AUX MOYENS DE PAIEMENT', 10),
('MR FOUAD EL ARCHAOUI', 'CHEF DU SERVICE DES AFFAIRES DIVERSES', 10),
('MR RABIE RHOUAT', 'CHEF DU SERVICE DES AFFAIRES PORTANT ATTEINTE AUX PERSONNES', 10),
('MR ZAKARIA EJJALTI', 'CHEF DU SERVICE SUIVI OPERATIONNEL ET COORDINATION', 10),
('MR NAOUFAL BENKIRANE', 'CHEF DU SERVICE DE LUTTE CONTRE LE TRAFIC DE DROGUES', 10),
('MR SOUFIANE EL HOMRANI', 'CHEF DU SERVICE ADMINISTRATIF ET LOGISTIQUE CYNOTECHNIQUE', 11),
('MR YOUSSEF NAZIH', 'CHEF DE LA SECTION DU PARC-AUTO CYNOTECHNIQUE', 11),
('MR THAMIEDDAHANE', 'CHEF DU SERVICE DE SUIVI CYNOTECHNIQUE', 11),
('MR MOHAMMED BRINETT', 'CHEF DU SERVICE LOGISTIQUE ET APPUI OPERATIONNEL', 11),
('MME NAJOUA FARAH', 'CHEFFE DU SYSTEME INTEGRE ABHAT', 10),
('MR ABDERRAHIM BIYI', 'DISP DGSN/DPJ', 10);

--vehicules
INSERT INTO vehicule (marque, police, nCivil, carburant) VALUES
('DACIA LOGAN','254531','17419-T-1','gasoil'),
('SKODA SUPERB','264949','59927-T-1','gasoil'),
('R.EXPRESS','254558','28633-T-1','gasoil'),
('SKODA SUPERB','264935','59913-T-1','gasoil'),
('R.EXPRESS','256974',NULL,'gasoil'),
('DACIA LOGAN','263207',NULL,'essence'),
('DACIA LOGAN','256757','28627-T-1','gasoil'),
('DACIA LODGY','187865',NULL,'gasoil'),
('SKODA SUPERB','264955','59933-T-1','gasoil'),
('DACIA LOGAN','217824','92626-H-1','essence'),
('DACIA LOGAN','244155','78917-E-1','gasoil'),
('SKODA SUPERB','264951','59929-T-1','gasoil'),
('DACIA LOGAN','250103','1860-T-1','gasoil'),
('SKODA SUPERB','264941','59919-T-1','gasoil'),
('SKODA SUPERB','264952','59930-T-1','gasoil'),
('DACIA LOGAN','256752','28622-T-1','gasoil'),
('DACIA LOGAN','254532','17420-T-1','gasoil'),
('DACIA LOGAN','254533','17421-T-1','gasoil'),
('DACIA LOGAN','256756','28626-T-1','gasoil'),
('DACIA LOGAN','254548','17436-T-1','gasoil'),
('DACIA LOGAN','250128','1885-T-1','gasoil'),
('DACIA LOGAN','250130','1887-T-1','gasoil'),
('DACIA LOGAN','254525','17413-T-1','gasoil'),
('DACIA LOGAN','254534','17422-T-1','gasoil'),
('DACIA LOGAN','243225','79405-E-1','essence'),
('DACIA LOGAN','243228','79407-E-1','essence'),
('DACIA LOGAN','243227','79406-E-1','essence'),
('MAZDA 6','257667','28602-T-1','essence'),
('DACIA LOGAN','256766','31457-T-1','gasoil'),
('FORD FUSION','209923','70582-E-1','gasoil'),
('DACIA LOGAN','202343','82340-H-1','essence'),
('MAZDA 6','256017','26031-T-1','essence'),
('DACIA LOGAN','256777','31466-T-1','gasoil'),
('SKODA OCTAVIA','253635','41211-H-1','gasoil'),
('DACIA LOGAN','208300','66611-E-1','essence'),
('DACIA LOGAN','208293','73340-H-1','essence'),
('DACIA LOGAN','202350','85846-H-1','essence'),
('DACIA LOGAN','217828','92630-H-1','essence'),
('DACIA LOGAN','256771','31462-T-1','gasoil'),
('DACIA LOGAN','202308','43870-H-1','essence'),
('BMW 520I','218371','93303-E-1','essence'),
('HYUNDAI ACCENT','241969','76458-E-1','gasoil'),
('HYUNDAI ACCENT','241964','76453-E-1','gasoil'),
('CADDY','244135','79408-E-1','gasoil'),
('NISSAN EVALIA','205694','47870-H-1','gasoil'),
('SKODA OCTAVIA','257241','28606-T-1','gasoil'),
('DACIA LOGAN','208306','82353-H-1','essence'),
('SKODA OCTAVIA','257242','34916-T-1','gasoil'),
('HYUNDAI ACCENT','241963','76452-E-1','gasoil'),
('CADDY','217969','99150-H-1','gasoil');
INSERT INTO vehicule (marque, police, nCivil, carburant) VALUES
('SKODA','257245','62002-T-1','gasoil'),
('SKODA OCTAVIA','244189','93832-E-1','gasoil'),
('HYUNDAI ACCENT','241971','70460-E-1','gasoil'),
('SKODA OCTAVIA','244191','93834-E-1','gasoil'),
('FIAT TIPO','239196','74631-E-1','essence'),
('CITROEN BERLINGO','257454',NULL,'gasoil'),
('FIAT DUCATO (AMB)','230468',NULL,'gasoil'),
('FIAT DUCATO (AMB)','227291',NULL,'gasoil'),
('DACIA LOGAN','243234','78912-E-1','essence'),
('DACIA LOGAN','243230','78918-E-1','essence'),
('DACIA LOGAN','243233','78921-E-1','essence'),
('DACIA LOGAN','217827','92629-H-1','essence'),
('SKODA OCTAVIA','244185','93828-E-1','gasoil'),
('DACIA LOGAN','256763','31454-T-1','gasoil'),
('DACIA LOGAN','202338','46601-H-1','essence'),
('SKODA SUPERB','264934','59912-T-1','gasoil'),
('DACIA LODGY','253754','29230-H-1','gasoil'),
('DACIA LOGAN','244160','86952-E-1','gasoil'),
('DACIA LODGY','253758',NULL,'gasoil'),
('FIAT TIPO','212416','75409-H-1','gasoil'),
('SKODA SUPERB','264932','59910-T-1','gasoil'),
('SKODA SUPERB','264937','59915-T-1','gasoil'),
('SKODA SUPERB','264933','59911-T-1','gasoil'),
('SKODA SUPERB','264936','59914-T-1','gasoil'),
('SKODA SUPERB','264944','59922-T-1','gasoil'),
('FIAT TIPO','212452','74003-H-1','gasoil'),
('DACIA LOGAN','254529','17417-T-1','gasoil'),
('DACIA LOGAN','217802','92604-H-1','essence'),
('FIAT TIPO','226939','22455-E-1','essence'),
('DACIA LOGAN','217808','92610-H-1','essence'),
('DACIA LOGAN','217818','92620-H-1','essence'),
('DACIA LOGAN','217820','92622-H-1','essence'),
('DACIA LOGAN','217800','92602-H-1','essence'),
('DACIA LOGAN','217821','92623-H-1','essence'),
('DACIA LOGAN','256747','28617-T-1','gasoil'),
('DACIA LOGAN','256762','28632-H-1','gasoil'),
('DACIA LOGAN','217811','92613-H-1','essence'),
('DACIA LOGAN','217813','92615-H-1','essence'),
('DACIA LOGAN','217814','92616-H-1','essence'),
('DACIA LOGAN','217803','92605-H-1','essence'),
('HYUNDAI ACCENT','263126','59953-T-1','essence'),
('DACIA LOGAN','243224','78916-E-1','essence'),
('DACIA LOGAN','243223','78914-E-1','essence'),
('TOYOTA COROLLA HYBRID','244209','78934-E-1','essence'),
('DACIA LOGAN','222229','20891-E-1','essence'),
('DACIA LOGAN','236916','57405-E-1','essence'),
('CITROEN ELYSEE','186515','15693-H-1','essence'),
('DACIA LOGAN','244164','89612-E-1','gasoil'),
('DACIA LOGAN','208321','82331-H-1','essence'),
('DACIA LOGAN','217829','92631-H-1','essence');

INSERT INTO vehicule (police, ncivil, marque, carburant, km) VALUES
('186416','37990-H-1','DACIA LOGAN','essence',NULL),
('244212','78937-E-1','TOYOTA COROLLA','essence',NULL),
('209929','70588-H-1','FORD FUSION','gasoil',NULL),
('256759','28629-T-1','DACIA LOGAN','gasoil',NULL),
('241968','76457-E-1','HYUNDAI ACCENT','gasoil',NULL),
('239193','67391-E-1','FIAT TIPO','essence',NULL),
('202309','43871-H-1','DACIA LOGAN','essence',NULL),
('264953','59931-T-1','SKODA SUPERB','gasoil',NULL),
('208314','82361-H-1','DACIA LOGAN','essence',NULL),
('208304','82351-H-1','DACIA LOGAN','essence',NULL),
('208308','82355-H-1','DACIA LOGAN','essence',NULL),
('208310','82357-H-1','DACIA LOGAN','essence',NULL),
('256751','28621-T-1','DACIA LOGAN','gasoil',NULL),
('254545','17433-T-1','DACIA LOGAN','gasoil',NULL),
('264960','59938-T-1','SKODA SUPERB','gasoil',NULL),
('226876','22454-E-1','FIAT DOBLO','gasoil',NULL),
('264945','59923-T-1','SKODA SUPERB','gasoil',NULL),
('217798','92600-H-1','DACIA LOGAN','essence',NULL),
('208317','82364-H-1','DACIA LOGAN','essence',NULL),
('208322','82332-H-1','DACIA LOGAN','essence',NULL),
('208326','82336-H-1','DACIA LOGAN','essence',NULL),
('256744','28614-T-1','DACIA LOGAN','gasoil',NULL),
('256748','28618-T-1','DACIA LOGAN','gasoil',NULL),
('256746','28616-T-1','DACIA LOGAN','gasoil',NULL),
('256743','28613-T-1','DACIA LOGAN','gasoil',NULL),
('208319','82366-H-1','DACIA LOGAN','essence',NULL),
('202298','39850-H-1','DACIA LOGAN','essence',NULL),
('208318','82365-H-1','DACIA LOGAN','essence',NULL),
('236918','59535-E-1','DACIA LOGAN','essence',NULL),
('236919','59536-E-1','DACIA LOGAN','essence',NULL),
('254549','17437-T-1','DACIA LOGAN','gasoil',NULL),
('264943','59921-T-1','SKODA SUPERB','gasoil',NULL),
('254536','17424-T-1','DACIA LOGAN','gasoil',NULL),
('264958','59936-T-1','SKODA SUPERB','gasoil',NULL),
('244210','78935-E-1','TOYOTA COROLLA HYBRID','essence',NULL),
('264942','59920-T-1','SKODA SUPERB','gasoil',NULL),
('263120','59947-T-1','HYUNDAI ACCENT','essence',NULL),
('244203','78928-E-1','TOYOTA COROLLA HYBRID','essence',NULL),
('209926','70585-H-1','FORD FUSION','gasoil',NULL),
('264957','59935-T-1','SKODA SUPERB','gasoil',NULL),
('264939','59917-T-1','SKODA SUPERB','gasoil',NULL),
('228214','24970-E-1','TOUAREG','gasoil',NULL),
('243236','79411-E-1','DACIA LOGAN','essence',NULL),
('254535','17423-T-1','DACIA LOGAN','gasoil',NULL),
('244166','89614-E-1','DACIA LOGAN','gasoil',NULL),
('244220','78945-E-1','TOYOTA COROLLA HYBRID','essence',NULL),
('264959','59937-T-1','SKODA SUPERB','gasoil',NULL),
('202369','46602-H-1','DACIA LOGAN','essence',NULL),
('253736','23062-T-1','DACIA LODGY','gasoil',NULL),
('254523','17411-T-1','DACIA LOGAN','gasoil',NULL),
('250129','1886-T-1','DACIA LOGAN','gasoil',NULL),
('254527','17415-T-1','DACIA LOGAN','gasoil',NULL),
('254526','17414-T-1','DACIA LOGAN','gasoil',NULL),
('260770','80430-E-1','SKODA OCTAVIA','gasoil',NULL),
('243269','93810-E-1','SKODA OCTAVIA','gasoil',NULL),
('217832','92634-H-1','DACIA LOGAN','essence',NULL),
('209943','70602-H-1','FORD FUSION','gasoil',NULL),
('217833','92635-H-1','DACIA LOGAN','essence',NULL),
('217836','92638-H-1','DACIA LOGAN','essence',NULL),
('217823','92625-H-1','DACIA LOGAN','essence',NULL);

INSERT INTO vehicule (police, ncivil, marque, carburant, km) VALUES
('254543','17431-E-1','DACIA LOGAN','gasoil',NULL),
('222295','66612-E-1','DACIA LOGAN','essence',NULL),
('202337','63861-H-1','DACIA LOGAN','essence',NULL),
('226759',NULL,'DACIA LOGAN','essence',NULL),
('226756','60380-E-1','DACIA LOGAN','essence',NULL),
('226757','60503-E-1','DACIA LOGAN','essence',NULL),
('254530','17418-T-1','DACIA LOGAN','gasoil',NULL),
('222244',NULL,'DACIA LOGAN','essence',NULL),
('202355','5160-E-1','DACIA LOGAN','essence',NULL),
('217817','92619-H-1','DACIA LOGAN','essence',NULL),
('202368','45711-H-1','DACIA LOGAN','essence',NULL),
('243237','78919-E-1','DACIA LOGAN','essence',NULL),
('243231','78920-E-1','DACIA LOGAN','essence',NULL),
('243235','79410-E-1','DACIA LOGAN','essence',NULL),
('186454','97251-D-1','DACIA LOGAN','essence',NULL),
('256741','28611-T-1','DACIA LOGAN','gasoil',NULL),
('250131','1888-T-1','DACIA LOGAN','gasoil',NULL),
('256767','31458-T-1','DACIA LOGAN','gasoil',NULL),
('257671','37912-T-1','MAZDA 6','essence',NULL),
('264948','59926-T-1','SKODA SUPERB','gasoil',NULL),
('263135','59962-T-1','HYUNDAI ACCENT','essence',NULL),
('244154','83631-E-1','DACIA LOGAN','gasoil',NULL),
('202336','94420-H-1','DACIA LOGAN','essence',NULL),
('263141','59968-T-1','HYUNDAI ACCENT','essence',NULL),
('263138','59965-T-1','HYUNDAI ACCENT','essence',NULL),
('244162','88703-H-1','DACIA LOGAN','gasoil',NULL),
('263139','59966-T-1','HYUNDAI ACCENT','essence',NULL),
('264950','59928-T-1','SKODA SUPERB','gasoil',NULL),
('263137','59964-T-1','HYUNDAI ACCENT','essence',NULL),
('263134','59961-T-1','HYUNDAI ACCENT','essence',NULL),
('263136','59963-T-1','HYUNDAI ACCENT','essence',NULL),
('241966','76455-E-1','HYUNDAI ACCENT','gasoil',NULL),
('264954','59932-T-1','SKODA SUPERB','gasoil',NULL),
('165014',NULL,'HYNDAI AMBULANCE','gasoil',NULL),
('208332','95980-H-1','DACIA LOGAN','essence',NULL),
('264946','59924-T-1','SKODA SUPERB','gasoil',NULL),
('264938','59916-T-1','SKODA SUPERB','gasoil',NULL),
('264947','59925-T-1','SKODA SUPERB','gasoil',NULL),
('241967','76456-E-1','HYUNDAI ACCENT','gasoil',NULL),
('263181','59973-T-1','DACIA LOGAN','gasoil',NULL),
('249653',NULL,'R.EXPRESS','gasoil',NULL),
('236932','57401-E-1','DACIA LOGAN','essence',NULL),
('254524','17412-T-1','DACIA LOGAN','gasoil',NULL),
('254522','17410-T-1','DACIA LOGAN','gasoil',NULL),
('222307','20893-E-1','DACIA LOGAN','essence',NULL),
('236931','57400-E-1','DACIA LOGAN','essence',NULL),
('250213',NULL,'SKODA OCTAVIA','gasoil',NULL),
('264940','59918-T-1','SKODA SUPERB','gasoil',NULL),
('202326',NULL,'DACIA LOGAN','essence',NULL),
('264956','59934-T-1','SKODA SUPERB','gasoil',NULL),
('222280','18620-E-1','DACIA LOGAN','essence',NULL),
('222292','18621-E-1','DACIA LOGAN','essence',NULL),
('217810','92612-H-1','DACIA LOGAN','essence',NULL),
('256738','28608-T-1','DACIA LOGAN','gasoil',NULL),
('202303','43861-H-1','DACIA LOGAN','essence',NULL),
('236934','57403-E-1','DACIA LOGAN','essence',NULL),
('236935','57404-E-1','DACIA LOGAN','essence',NULL),
('243226','78911-E-1','DACIA LOGAN','essence',NULL),
('243229','83630-E-1','DACIA LOGAN','essence',NULL),
('244167','93318-E-1','DACIA LOGAN','essence',NULL);

INSERT INTO vehicule (marque, police, nCivil, carburant) VALUES
('HYUNDAI ACCENT', '241977', '93806-E-1', 'gasoil'),
('DACIA LOGAN', '250120', '1877-T-1', 'gasoil'),
('DACIA LOGAN', '250119', '1876-T-1', 'gasoil'),
('DACIA LODGY', '253742', NULL, 'gasoil'),
('DACIA LOGAN', '202359', '63865-H-1', 'essence'),
('DACIA LOGAN', '256745', '28615-T-1', 'gasoil'),
('DACIA LOGAN', '226738', '37949-E-1', 'essence'),
('CHEVROLET CRUZE', '198923', NULL, 'essence'),
('DACIA LOGAN', '256770', '31461-T-1', 'gasoil'),
('MAZDA 6', '257665', '28600-T-1', 'essence'),
('R.EXPRESS', '249630', NULL, 'gasoil'),
('R.EXPRESS', '256936', '29232-T-1', 'gasoil'),
('R.EXPRESS', '256937', '29233-T-1', 'gasoil'),
('FIAT TIPO', '212486', '74032-H-1', 'gasoil'),
('TOYOTA COROLLA HYBRID', '244215', '79940-E-1', 'essence'),
('DACIA LOGAN', '186418', '82610-H-1', 'essence'),
('DACIA LOGAN', '217807', '92609-H-1', 'essence'),
('TOYOTA COROLLA HYBRID', '244208', '78933-E-1', 'essence'),
('SKODA SUPERB', '264961', '59939-T-1', 'gasoil'),
('DACIA LOGAN', '208329', '82821-H-1', 'essence'),
('DACIA LOGAN', '186436', '43681-H-1', 'essence'),
('DACIA LOGAN', '244172', '96604-E-1', 'gasoil'),
('FORD FUSION', '216843', '88033-H-1', 'gasoil'),
('CITROEN BERLINGO', '257463', '40084-T-1', 'gasoil'),
('DACIA LOGAN', '256761', '28631-T-1', 'gasoil'),
('DACIA LOGAN', '256749', '28619-T-1', 'gasoil'),
('DACIA LOGAN', '226722', '22313-E-1', 'essence'),
('DACIA LOGAN', '186203', '78151-D-1', 'essence'),
('CADDY', '217975', '38320-H-1', 'gasoil'),
('TOYOTA COROLLA HYBRID', '244211', '78936-E-1', 'essence'),
('CITROEN BERLINGO', '257464', '40085-T-1', 'gasoil'),
('DACIA LOGAN', '186452', '28496-H-1', 'essence'),
('TOYOTA COROLLA HYBRID', '244216', '78941-E-1', 'essence'),
('TOYOTA COROLLA HYBRID', '244205', '78930-E-1', 'essence'),
('TOYOTA COROLLA HYBRID', '244223', '78948-E-1', 'essence'),
('DACIA LOGAN', '222249', '20892-H-1', 'essence'),
('DACIA LOGAN', '256758', '28628-T-1', 'gasoil'),
('CADDY', '205757', '65584-H-1', 'gasoil'),
('DACIA LOGAN', '186444', '63021-E-1', 'essence'),
('TOYOTA COROLLA HYBRID', '244214', '78939-E-1', 'essence'),
('SKODA SUPERB', '264964', '59942-T-1', 'gasoil'),
('DACIA LOGAN', '208325', '82335-H-1', 'essence'),
('TOYOTA COROLLA HYBRID', '244207', '78932-E-1', 'essence'),
('TOYOTA COROLLA HYBRID', '244201', '78926-E-1', 'essence'),
('DACIA LOGAN', '244161', '88702-E-1', 'gasoil'),
('HONDA ACCORD', '170295', '11651-D-1', 'essence'),
('TOYOTA COROLLA HYBRID', '244219', '78944-E-1', 'essence'),
('CITROEN BERLINGO', '186166', '77380-D-1', 'gasoil'),
('TOYOTA COROLLA', '148006', '32777-B-1', 'essence'),
('TOYOTA COROLLA HYBRID', '244213', '78938-E-1', 'essence'),
('DACIA LOGAN', '250121', '1878-T-1', 'gasoil'),
('CITROEN BERLINGO', '257409', '28607-T-1', 'gasoil'),
('TOYOTA COROLLA HYBRID', '244199', '78924-E-1', 'essence'),
('CADDY', '249538', '21630-T-1', 'gasoil'),
('DACIA LOGAN', '256754', '28624-T-1', 'gasoil'),
('R.SYMBOL', '176194', '41936-D-1', 'gasoil'),
('TOYOTA COROLLA HYBRID', '244221', '78946-E-1', 'essence'),
('RENAULT MASTER', '244077', '93841-E-1', 'gasoil'),
('SKODA SUPERB', '264962', '59940-T-1', 'gasoil'),
('CITROEN BERLINGO', '257468', '40086-T-1', 'gasoil'),
('DACIA LOGAN', '202334', '67081-H-1', 'essence'),
('DACIA LOGAN', '202299', '39851-H-1', 'essence'),
('DACIA LOGAN', '202358', '83767-H-1', 'essence'),
('FIAT DOBLO', '226873', '22451-E-1', 'gasoil'),
('DACIA LOGAN', '188338', NULL, 'essence'),
('CADDY', '244148', '9501-T-1', 'gasoil'),
('CADDY', '249539', '21631-T-1', 'gasoil'),
('DACIA LOGAN', '186429', '13470-H-1', 'essence'),
('R.KANGOO', '256778', '29921-T-1', 'gasoil'),
('DACIA LOGAN', '186445', '34582-H-1', 'essence'),
('FIAT DOBLO', '225693', '28340-E-1', 'gasoil'),
('TOYOTA COROLLA HYBRID', '244202', '78927-E-1', 'essence'),
('DACIA LOGAN', '217801', '92603-H-1', 'essence'),
('DACIA LOGAN', '217806', '92608-H-1', 'essence'),
('DACIA LOGAN', '208315', '82362-H-1', 'essence'),
('DACIA LOGAN', '217812', '92614-H-1', 'essence'),
('DACIA LOGAN', '208299', '58050-H-1', 'essence'),
('DACIA LOGAN', '226723', '22314-E-1', 'essence'),
('DACIA LOGAN', '202293', '38381-H-1', 'essence'),
('KANGOO', '150840', NULL, 'gasoil'),
('DACIA LOGAN', '222238', '15421-E-1', 'essence'),
('P.103 NINJA', '80192', NULL, 'essence'),
('RYMCO', '100612', NULL, 'essence'),
('MOTO BECANE', '105068', NULL, 'essence'),
('PEUGEOT 103', '80187', NULL, 'essence'),
('SCOOTER', '50163', NULL, 'essence'),
('SCOOTER', '48062', NULL, 'essence'),
('SCOOTER', '50157', NULL, 'essence'),
('MOTO BMW', '192179', NULL, 'essence'),
('MOTO BECANE', '105060', NULL, 'essence'),
('RYMCO', '82009', NULL, 'essence'),
('RYMCO C50', '100620', NULL, 'essence'),
('RYMCO', '95579', NULL, 'essence'),
('RYMCO', '81951', NULL, 'essence'),
('RYMCO', '81988', NULL, 'essence'),
('RYMCO', '82005', NULL, 'essence'),
('RYMCO', '101735', NULL, 'essence'),
('BECANE', '105063', NULL, 'essence'),
('RYMCO', '81382', NULL, 'essence'),
('RYMCO', '97768', NULL, 'essence'),
('RYMCO', '95521', NULL, 'essence'),
('RYMCO', '95520', NULL, 'essence'),
('RYMCO', '100626', NULL, 'essence'),
('RYMCO', '95526', NULL, 'essence'),
('RYMCO', '97774', NULL, 'essence'),
('RYMCO', '97760', NULL, 'essence'),
('RYMCO', '97770', NULL, 'essence'),
('RYMCO', '97767', NULL, 'essence'),
('RYMCO', '100623', NULL, 'essence'),
('RYMCO', '97771', NULL, 'essence'),
('RYMCO', '97776', NULL, 'essence'),
('RYMCO', '100619', NULL, 'essence'),
('RYMCO', '100643', NULL, 'essence'),
('RYMCO', '100608', NULL, 'essence'),
('RYMCO', '100616', NULL, 'essence'),
('BECANE', '105057', NULL, 'essence'),
('BECANE', '105049', NULL, 'essence');