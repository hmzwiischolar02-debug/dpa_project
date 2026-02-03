CREATE DATABASE dpa_SCL
WITH
ENCODING = 'UTF8'
LC_COLLATE = 'en_US.UTF-8'
LC_CTYPE = 'en_US.UTF-8'
TEMPLATE = template0;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) CHECK (role IN ('admin','agent')) NOT NULL
);

INSERT INTO users (username,password_hash,role)
VALUES ('admin', crypt('admin123', gen_salt('bf')), 'admin');

CREATE TABLE service (
    id serial PRIMARY KEY,
    nom TEXT NOT NULL,
    direction TEXT NOT NULL
);
INSERT INTO service (nom,direction) VALUES
('SCL','DEB'),('SAA','DEB'),('SEE','DEB'),('SRE','DEB'),
('SHE','DRH'),('SID','DRH'),('SEV','DRH'),('STH','DRH'),
('SGG','DRG'),('SBH','DRG'),('SVH','DRG'),('SWT','DRG'),
('SJJ','DPJ'),('SMJ','DPJ'),('SAC','DPJ'),('SEP','DPJ'),
('SEC','DSP'),('SCC','DSP'),('SAP','DSP'),('SAR','DSP');

CREATE TABLE benificiaire (
    id serial PRIMARY KEY ,
    matricule TEXT NOT NULL UNIQUE,
    nom TEXT NOT NULL,
    fonction TEXT NOT NULL,
    service_id INTEGER NOT NULL,
    FOREIGN KEY (service_id) REFERENCES service(id)
);

INSERT INTO benificiaire (matricule, nom, fonction, service_id) VALUES
('RSP001', 'El Amrani Ahmed', 'Chef de Service', 1),   -- Service Parc Auto
('RSP002', 'Bennani Khalid', 'Chef de Service', 2), -- Service Transport Administratif
('RSP003', 'Alaoui Samira', 'Chef de Service', 3),  -- Service Carburant
('RSP004', 'Chraibi Mohamed', 'Chef de Section', 4),    -- Service Maintenance Véhicules
('RSP005', 'Zerouali Fatima', 'Chef de Section', 5),       -- Service Carrière
('RSP006', 'Idrissi Youssef', 'Chef de Section', 6),   -- Service Préparation Budgétaire
('RSP007', 'Lahlou Hassan', 'Chef de Division', 7),      -- Service Dépenses
('RSP008', 'Oukili Nadia', 'Chef de Division', 8), -- Service Développement Logiciel
('RSP009', 'Benchekroun Rachid', 'Chef de Division', 9),       -- Service Support Utilisateurs
('RSP010', 'Sbaï Leila', 'Chef de Division', 10);      -- Service Sécurité

CREATE TABLE vehicule (
    id SERIAL PRIMARY KEY,
    police VARCHAR(20) NOT NULL UNIQUE,
	nCivil VARCHAR(30) NOT NULL UNIQUE,
    marque VARCHAR(50),
    carburant VARCHAR(20) NOT NULL
        CHECK (carburant IN ('gazoil', 'essence')),
    km INTEGER NOT NULL CHECK (km >= 0),
    service_id INTEGER NOT NULL,
    actif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES service(id)
);

INSERT INTO vehicule 
(police,nCivil, marque, carburant, km, service_id) 
VALUES
('120001','123/E/1', 'Dacia Logan', 'gazoil', 10000, 1),   -- Parc Auto
('120120', '10/E/1','Peugeot Partner', 'gazoil', 10000, 1), -- Transport Administratif
('99002', '0112/B/1','Dacia Logan', 'essence', 10000, 2), -- Carburant
('82991', '4123/B/1','Dacia Logan', 'gazoil', 10000, 2), -- Maintenance Véhicules
('154098','5648/C/1','Hyundai Accent', 'essence', 10000,3), -- RH
('132432', '3654/C/1','Skoda Octavia', 'gazoil', 10000, 3), -- Budget
('175443','2549/E/1', 'Volkswagen Caddy', 'gazoil', 10000, 4), -- Comptabilité
('140231', '1248/D/1','Volkswagen Caddy', 'gazoil', 10000, 4), -- Développement Logiciel
('143876','658/D/1', 'Renault Express', 'gazoil', 10000,5), -- Support IT
('122332','123/B/1', 'Fiat Doblo', 'gazoil', 10000, 6);  -- Sécurité

CREATE TABLE dotation (
    id SERIAL PRIMARY KEY,
	NumOrdre INTEGER NOT NULL,
    vehicule_id INTEGER NOT NULL,
	benificiaire_id integer not null,
    mois INTEGER NOT NULL CHECK (mois BETWEEN 1 AND 12),
    annee INTEGER NOT NULL CHECK (annee >= 2020),
    qte INTEGER NOT NULL CHECK (qte IN (120, 140)),
    qte_consomme NUMERIC(6,2) DEFAULT 0 CHECK (qte_consomme >= 0),
	reste NUMERIC(6,2) GENERATED ALWAYS AS (qte - qte_consomme) STORED,
    cloture BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (vehicule_id, mois, annee),
	FOREIGN KEY (benificiaire_id) REFERENCES benificiaire(id),
    FOREIGN KEY (vehicule_id) REFERENCES vehicule(id)
        ON DELETE CASCADE
);

INSERT INTO dotation
(NumOrdre,vehicule_id,benificiaire_id, mois, annee, qte)
VALUES
(1,1, 1, 2, 2026, 140),
(2,2, 1, 2, 2026, 120),
(3,3, 2, 2, 2026, 120),
(4,4, 2, 2, 2026, 140),
(5,5, 3, 2, 2026, 140),
(6,6, 3, 2, 2026, 120),
(7,7, 4, 2, 2026, 120),
(8,8, 4, 2, 2026, 140);
CREATE TABLE approvisionnement (
    id SERIAL PRIMARY KEY,
    dotation_id INTEGER NOT NULL,
    date TIMESTAMP NOT NULL DEFAULT NOW(),
    qte NUMERIC(6,2) NOT NULL CHECK (qte > 0),
    km_precedent INTEGER NOT NULL,
    km INTEGER NOT NULL,
    anomalie BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (dotation_id) REFERENCES dotation(id)
);

INSERT INTO approvisionnement
(dotation_id, qte, km_precedent, km_actuel)
VALUES
(1, 40, 10000, 10500),
(1, 35, 10500, 10900);
INSERT INTO approvisionnement
(dotation_id, qte, km_precedent, km_actuel)
VALUES
(2, 20, 10000, 10720),
(2, 15, 10720, 11230),
(2, 20, 11230, 11856);
INSERT INTO approvisionnement
(dotation_id, qte, km_precedent, km_actuel)
VALUES
(3, 25, 10000, 11004),
(3, 30, 11004, 11645),
(3, 35, 11645, 12230);
INSERT INTO approvisionnement
(vehdot_id, qte, km_precedent, km_actuel)
VALUES
(4, 50, 61200, 61540),
(4, 40, 61540, 61890);


CREATE OR REPLACE FUNCTION update_qteCo()
RETURNS TRIGGER AS $$
DECLARE
    v_dot_id INTEGER;
BEGIN
    -- نحدد vehdot_id سواء INSERT / UPDATE / DELETE
    v_dot_id := COALESCE(NEW.dotation_id, OLD.dotation_id);

    UPDATE dotation
    SET qte_consomme = COALESCE(
        (SELECT SUM(qte)
         FROM approvisionnement
         WHERE dotation_id = v_dot_id),
        0
    )
    WHERE id = v_dot_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_update_qteC_after_approo
AFTER UPDATE OR DELETE ON approvisionnement
FOR EACH ROW
EXECUTE FUNCTION update_qteCo();
--trigger to check the quota
CREATE OR REPLACE FUNCTION trg_check_quota3()
RETURNS TRIGGER AS $$
DECLARE
    v_quota INTEGER;
    v_consomme NUMERIC(6,2);
    v_total NUMERIC(6,2);
BEGIN
    -- قفل سطر vehdot لتفادي التوازي
    SELECT qte, qte_consomme
    INTO v_quota, v_consomme
    FROM dotation
    WHERE id = NEW.dotation_id
    FOR UPDATE;

    -- حساب المجموع بعد التزويد
    v_total := v_consomme + NEW.qte;

    -- التحقق من تجاوز الحصة
    IF v_total > v_quota THEN
		UPDATE dotation set cloture = true where id=new.dotation_id;
        RAISE EXCEPTION
        'Approvisionnement refusee , Quota mensuel dépassé (%.2f / % L)',
        v_total, v_quota;
    END IF;
	IF v_total = v_quota THEN
		UPDATE dotation set cloture = true ,qte_consomme = v_total where id=new.dotation_id;
    END IF;
    -- تحديث الاستهلاك الشهري
    UPDATE dotation
    SET qte_consomme = v_total
    WHERE id = NEW.dotation_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_quota_appro
BEFORE INSERT ON approvisionnement
FOR EACH ROW
EXECUTE FUNCTION trg_check_quota3();

--trigger to update km after insertion
CREATE OR REPLACE FUNCTION update_vehicle_km()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE vehicule
    SET km = NEW.km
    WHERE id = (
        SELECT vehicule_id
        FROM dotation
        WHERE id = NEW.dotation_id
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_km_after_appro
AFTER INSERT ON approvisionnement
FOR EACH ROW
EXECUTE FUNCTION update_vehicle_km();

--trigger to close the vehdot after the next vehdot open
CREATE OR REPLACE FUNCTION trg_close_previous_vehdot()
RETURNS TRIGGER AS $$
DECLARE
    prev_mois INTEGER;
    prev_annee INTEGER;
BEGIN
    -- حساب الشهر السابق
    IF NEW.mois = 1 THEN
        prev_mois := 12;
        prev_annee := NEW.annee - 1;
    ELSE
        prev_mois := NEW.mois - 1;
        prev_annee := NEW.annee;
    END IF;

    -- إغلاق الشهر السابق إن وُجد
    UPDATE dotation
    SET cloture = TRUE
    WHERE vehicule_id = NEW.vehicule_id
      AND mois = prev_mois
      AND annee = prev_annee
      AND cloture = FALSE;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_auto_cloture_vehdot
AFTER INSERT ON dotation
FOR EACH ROW
EXECUTE FUNCTION trg_close_previous_vehdot();

--trigger to denie any appro after the end of each vehdot
CREATE OR REPLACE FUNCTION trg_prevent_appro_if_cloture()
RETURNS TRIGGER AS $$
DECLARE
    v_cloture BOOLEAN;
BEGIN
    -- التحقق من حالة الشهر
    SELECT cloture
    INTO v_cloture
    FROM dotation
    WHERE id = NEW.dotation_id;

    IF v_cloture = TRUE THEN
        RAISE EXCEPTION
        'Impossible d''ajouter un approvisionnement : mois clôturé';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_check_cloture
BEFORE INSERT ON approvisionnement
FOR EACH ROW
EXECUTE FUNCTION trg_prevent_appro_if_cloture();



INSERT INTO approvisionnement
(dotation_id, qte, km_precedent, km)
VALUES
(1, 40, 10000, 10500),
(1, 35, 10500, 10900);
INSERT INTO approvisionnement
(dotation_id, qte, km_precedent, km)
VALUES
(2, 20, 10000, 10720),
(2, 15, 10720, 11230),
(2, 20, 11230, 11856);
INSERT INTO approvisionnement
(dotation_id, qte, km_precedent, km)
VALUES
(3, 25, 10000, 11004),
(3, 30, 11004, 11645),
(3, 35, 11645, 12230);
INSERT INTO approvisionnement
(dotation_id, qte, km_precedent, km)
VALUES
(4, 50, 61200, 61540),
(4, 40, 61540, 61890);

select * from approvisionnement