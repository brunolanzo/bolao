PRAGMA foreign_keys = ON;

-- ============================================================
-- TABLE CREATION
-- ============================================================

CREATE TABLE IF NOT EXISTS "User" (
  id       TEXT PRIMARY KEY,
  name     TEXT NOT NULL,
  email    TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role     TEXT NOT NULL DEFAULT 'user',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "Team" (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  code       TEXT UNIQUE NOT NULL,
  groupLabel TEXT NOT NULL,
  flagUrl    TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS "Match" (
  id          TEXT PRIMARY KEY,
  phase       TEXT NOT NULL,
  groupLabel  TEXT,
  matchOrder  INTEGER NOT NULL,
  homeTeamId  TEXT,
  awayTeamId  TEXT,
  homeScore   INTEGER,
  awayScore   INTEGER,
  matchDate   TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'SCHEDULED',
  FOREIGN KEY (homeTeamId) REFERENCES "Team"(id),
  FOREIGN KEY (awayTeamId) REFERENCES "Team"(id)
);

CREATE TABLE IF NOT EXISTS "MatchPrediction" (
  id        TEXT PRIMARY KEY,
  userId    TEXT NOT NULL,
  matchId   TEXT NOT NULL,
  homeScore INTEGER NOT NULL,
  awayScore INTEGER NOT NULL,
  points    INTEGER,
  UNIQUE(userId, matchId),
  FOREIGN KEY (userId)  REFERENCES "User"(id)  ON DELETE CASCADE,
  FOREIGN KEY (matchId) REFERENCES "Match"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "PhasePrediction" (
  id      TEXT PRIMARY KEY,
  userId  TEXT NOT NULL,
  teamId  TEXT NOT NULL,
  phase   TEXT NOT NULL,
  correct INTEGER,
  points  INTEGER,
  UNIQUE(userId, teamId, phase),
  FOREIGN KEY (userId) REFERENCES "User"(id) ON DELETE CASCADE,
  FOREIGN KEY (teamId) REFERENCES "Team"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "ChampionPrediction" (
  id               TEXT PRIMARY KEY,
  userId           TEXT UNIQUE NOT NULL,
  championTeamId   TEXT NOT NULL,
  runnerUpTeamId   TEXT NOT NULL,
  thirdPlaceTeamId TEXT NOT NULL,
  championPoints   INTEGER,
  runnerUpPoints   INTEGER,
  thirdPlacePoints INTEGER,
  FOREIGN KEY (userId) REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Settings" (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "Payment" (
  id        TEXT PRIMARY KEY,
  userId    TEXT UNIQUE NOT NULL,
  paid      INTEGER NOT NULL DEFAULT 0,
  paidAt    TEXT,
  markedBy  TEXT,
  FOREIGN KEY (userId) REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "BankDetails" (
  id        TEXT PRIMARY KEY,
  userId    TEXT UNIQUE NOT NULL,
  fullName  TEXT NOT NULL,
  cpf       TEXT NOT NULL,
  bank      TEXT NOT NULL,
  agency    TEXT NOT NULL,
  account   TEXT NOT NULL,
  pix       TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES "User"(id) ON DELETE CASCADE
);

-- ============================================================
-- TEAMS (48 teams)
-- ============================================================

-- Group A
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_MEX', 'México',          'MEX', 'A', '');
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_RSA', 'África do Sul',   'RSA', 'A', '');
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_KOR', 'Coreia do Sul',   'KOR', 'A', '');
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_UD',  'Vencedor UEFA D', 'UD',  'A', '');

-- Group B
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_CAN', 'Canadá',          'CAN', 'B', '');
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_SUI', 'Suíça',           'SUI', 'B', '');
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_QAT', 'Catar',           'QAT', 'B', '');
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_UA',  'Vencedor UEFA A', 'UA',  'B', '');

-- Group C
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_BRA', 'Brasil',          'BRA', 'C', '');
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_MAR', 'Marrocos',        'MAR', 'C', '');
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_HAI', 'Haiti',           'HAI', 'C', '');
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_SCO', 'Escócia',         'SCO', 'C', '');

-- Group D
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_USA', 'Estados Unidos',  'USA', 'D', '');
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_PAR', 'Paraguai',        'PAR', 'D', '');
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_AUS', 'Austrália',       'AUS', 'D', '');
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_UC',  'Vencedor UEFA C', 'UC',  'D', '');

-- Group E
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_GER', 'Alemanha',        'GER', 'E', '');
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_CUW', 'Curaçao',         'CUW', 'E', '');
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_CIV', 'Costa do Marfim', 'CIV', 'E', '');
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_ECU', 'Equador',         'ECU', 'E', '');

-- Group F
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_NED', 'Holanda',         'NED', 'F', '');
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_JPN', 'Japão',           'JPN', 'F', '');
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_TUN', 'Tunísia',         'TUN', 'F', '');
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_UB',  'Vencedor UEFA B', 'UB',  'F', '');

-- Group G
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_BEL', 'Bélgica',         'BEL', 'G', '');
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_EGY', 'Egito',           'EGY', 'G', '');
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_IRN', 'Irã',             'IRN', 'G', '');
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_NZL', 'Nova Zelândia',   'NZL', 'G', '');

-- Group H
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_ESP', 'Espanha',         'ESP', 'H', '');
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_CPV', 'Cabo Verde',      'CPV', 'H', '');
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_KSA', 'Arábia Saudita',  'KSA', 'H', '');
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_URU', 'Uruguai',         'URU', 'H', '');

-- Group I
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_FRA', 'França',          'FRA', 'I', '');
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_SEN', 'Senegal',         'SEN', 'I', '');
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_NOR', 'Noruega',         'NOR', 'I', '');
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_IC2', 'Vencedor IC 2',   'IC2', 'I', '');

-- Group J
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_ARG', 'Argentina',       'ARG', 'J', '');
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_ALG', 'Argélia',         'ALG', 'J', '');
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_AUT', 'Áustria',         'AUT', 'J', '');
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_JOR', 'Jordânia',        'JOR', 'J', '');

-- Group K
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_POR', 'Portugal',        'POR', 'K', '');
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_UZB', 'Uzbequistão',     'UZB', 'K', '');
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_COL', 'Colômbia',        'COL', 'K', '');
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_IC1', 'Vencedor IC 1',   'IC1', 'K', '');

-- Group L
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_GHA', 'Gana',            'GHA', 'L', '');
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_PAN', 'Panamá',          'PAN', 'L', '');
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_ENG', 'Inglaterra',      'ENG', 'L', '');
INSERT OR IGNORE INTO "Team" (id, name, code, groupLabel, flagUrl) VALUES ('t_CRO', 'Croácia',         'CRO', 'L', '');

-- ============================================================
-- GROUP STAGE MATCHES (72 matches)
-- ============================================================

-- Group A
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_001', 'GROUP', 'A', 1,  't_MEX', 't_RSA', '2026-06-11T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_002', 'GROUP', 'A', 2,  't_KOR', 't_UD',  '2026-06-11T21:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_025', 'GROUP', 'A', 25, 't_UD',  't_RSA', '2026-06-18T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_028', 'GROUP', 'A', 28, 't_MEX', 't_KOR', '2026-06-18T21:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_053', 'GROUP', 'A', 53, 't_UD',  't_MEX', '2026-06-24T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_054', 'GROUP', 'A', 54, 't_RSA', 't_KOR', '2026-06-24T18:00:00.000Z', 'SCHEDULED');

-- Group B
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_003', 'GROUP', 'B', 3,  't_CAN', 't_UA',  '2026-06-12T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_008', 'GROUP', 'B', 8,  't_QAT', 't_SUI', '2026-06-13T21:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_026', 'GROUP', 'B', 26, 't_SUI', 't_UA',  '2026-06-18T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_027', 'GROUP', 'B', 27, 't_CAN', 't_QAT', '2026-06-18T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_051', 'GROUP', 'B', 51, 't_SUI', 't_CAN', '2026-06-24T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_052', 'GROUP', 'B', 52, 't_UA',  't_QAT', '2026-06-24T18:00:00.000Z', 'SCHEDULED');

-- Group C
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_005', 'GROUP', 'C', 5,  't_HAI', 't_SCO', '2026-06-13T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_007', 'GROUP', 'C', 7,  't_BRA', 't_MAR', '2026-06-13T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_029', 'GROUP', 'C', 29, 't_BRA', 't_HAI', '2026-06-19T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_030', 'GROUP', 'C', 30, 't_SCO', 't_MAR', '2026-06-19T21:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_049', 'GROUP', 'C', 49, 't_SCO', 't_BRA', '2026-06-24T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_050', 'GROUP', 'C', 50, 't_MAR', 't_HAI', '2026-06-24T18:00:00.000Z', 'SCHEDULED');

-- Group D
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_004', 'GROUP', 'D', 4,  't_USA', 't_PAR', '2026-06-12T21:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_006', 'GROUP', 'D', 6,  't_AUS', 't_UC',  '2026-06-13T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_031', 'GROUP', 'D', 31, 't_UC',  't_PAR', '2026-06-19T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_032', 'GROUP', 'D', 32, 't_USA', 't_AUS', '2026-06-19T21:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_059', 'GROUP', 'D', 59, 't_UC',  't_USA', '2026-06-25T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_060', 'GROUP', 'D', 60, 't_PAR', 't_AUS', '2026-06-25T18:00:00.000Z', 'SCHEDULED');

-- Group E
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_009', 'GROUP', 'E', 9,  't_CIV', 't_ECU', '2026-06-14T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_010', 'GROUP', 'E', 10, 't_GER', 't_CUW', '2026-06-14T21:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_033', 'GROUP', 'E', 33, 't_GER', 't_CIV', '2026-06-20T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_034', 'GROUP', 'E', 34, 't_ECU', 't_CUW', '2026-06-20T21:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_055', 'GROUP', 'E', 55, 't_CUW', 't_CIV', '2026-06-25T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_056', 'GROUP', 'E', 56, 't_ECU', 't_GER', '2026-06-25T21:00:00.000Z', 'SCHEDULED');

-- Group F
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_011', 'GROUP', 'F', 11, 't_NED', 't_JPN', '2026-06-14T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_012', 'GROUP', 'F', 12, 't_UB',  't_TUN', '2026-06-14T21:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_035', 'GROUP', 'F', 35, 't_NED', 't_UB',  '2026-06-20T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_036', 'GROUP', 'F', 36, 't_TUN', 't_JPN', '2026-06-20T21:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_057', 'GROUP', 'F', 57, 't_JPN', 't_UB',  '2026-06-25T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_058', 'GROUP', 'F', 58, 't_TUN', 't_NED', '2026-06-25T21:00:00.000Z', 'SCHEDULED');

-- Group G
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_015', 'GROUP', 'G', 15, 't_IRN', 't_NZL', '2026-06-15T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_016', 'GROUP', 'G', 16, 't_BEL', 't_EGY', '2026-06-15T21:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_039', 'GROUP', 'G', 39, 't_BEL', 't_IRN', '2026-06-21T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_040', 'GROUP', 'G', 40, 't_NZL', 't_EGY', '2026-06-21T21:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_063', 'GROUP', 'G', 63, 't_EGY', 't_IRN', '2026-06-26T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_064', 'GROUP', 'G', 64, 't_NZL', 't_BEL', '2026-06-26T18:00:00.000Z', 'SCHEDULED');

-- Group H
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_013', 'GROUP', 'H', 13, 't_KSA', 't_URU', '2026-06-15T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_014', 'GROUP', 'H', 14, 't_ESP', 't_CPV', '2026-06-15T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_037', 'GROUP', 'H', 37, 't_URU', 't_CPV', '2026-06-21T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_038', 'GROUP', 'H', 38, 't_ESP', 't_KSA', '2026-06-21T21:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_065', 'GROUP', 'H', 65, 't_CPV', 't_KSA', '2026-06-26T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_066', 'GROUP', 'H', 66, 't_URU', 't_ESP', '2026-06-26T21:00:00.000Z', 'SCHEDULED');

-- Group I
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_017', 'GROUP', 'I', 17, 't_FRA', 't_SEN', '2026-06-16T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_018', 'GROUP', 'I', 18, 't_IC2', 't_NOR', '2026-06-16T21:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_041', 'GROUP', 'I', 41, 't_NOR', 't_SEN', '2026-06-22T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_042', 'GROUP', 'I', 42, 't_FRA', 't_IC2', '2026-06-22T21:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_061', 'GROUP', 'I', 61, 't_NOR', 't_FRA', '2026-06-26T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_062', 'GROUP', 'I', 62, 't_SEN', 't_IC2', '2026-06-26T21:00:00.000Z', 'SCHEDULED');

-- Group J
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_019', 'GROUP', 'J', 19, 't_ARG', 't_ALG', '2026-06-16T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_020', 'GROUP', 'J', 20, 't_AUT', 't_JOR', '2026-06-16T21:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_043', 'GROUP', 'J', 43, 't_ARG', 't_AUT', '2026-06-22T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_044', 'GROUP', 'J', 44, 't_JOR', 't_ALG', '2026-06-22T21:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_069', 'GROUP', 'J', 69, 't_ALG', 't_AUT', '2026-06-27T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_070', 'GROUP', 'J', 70, 't_JOR', 't_ARG', '2026-06-27T21:00:00.000Z', 'SCHEDULED');

-- Group K
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_023', 'GROUP', 'K', 23, 't_POR', 't_IC1', '2026-06-17T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_024', 'GROUP', 'K', 24, 't_UZB', 't_COL', '2026-06-17T21:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_047', 'GROUP', 'K', 47, 't_POR', 't_UZB', '2026-06-23T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_048', 'GROUP', 'K', 48, 't_COL', 't_IC1', '2026-06-23T21:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_071', 'GROUP', 'K', 71, 't_COL', 't_POR', '2026-06-27T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_072', 'GROUP', 'K', 72, 't_IC1', 't_UZB', '2026-06-27T21:00:00.000Z', 'SCHEDULED');

-- Group L
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_021', 'GROUP', 'L', 21, 't_GHA', 't_PAN', '2026-06-17T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_022', 'GROUP', 'L', 22, 't_ENG', 't_CRO', '2026-06-17T21:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_045', 'GROUP', 'L', 45, 't_ENG', 't_GHA', '2026-06-23T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_046', 'GROUP', 'L', 46, 't_PAN', 't_CRO', '2026-06-23T21:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_067', 'GROUP', 'L', 67, 't_PAN', 't_ENG', '2026-06-27T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, homeTeamId, awayTeamId, matchDate, status) VALUES ('m_068', 'GROUP', 'L', 68, 't_CRO', 't_GHA', '2026-06-27T21:00:00.000Z', 'SCHEDULED');

-- ============================================================
-- KNOCKOUT STAGE MATCHES (32 matches, no teams)
-- ============================================================

-- ROUND_32 (orders 73-88)
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, matchDate, status) VALUES ('m_073', 'ROUND_32', NULL, 73, '2026-06-28T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, matchDate, status) VALUES ('m_074', 'ROUND_32', NULL, 74, '2026-06-28T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, matchDate, status) VALUES ('m_075', 'ROUND_32', NULL, 75, '2026-06-28T21:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, matchDate, status) VALUES ('m_076', 'ROUND_32', NULL, 76, '2026-06-28T21:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, matchDate, status) VALUES ('m_077', 'ROUND_32', NULL, 77, '2026-06-29T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, matchDate, status) VALUES ('m_078', 'ROUND_32', NULL, 78, '2026-06-29T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, matchDate, status) VALUES ('m_079', 'ROUND_32', NULL, 79, '2026-06-29T21:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, matchDate, status) VALUES ('m_080', 'ROUND_32', NULL, 80, '2026-06-29T21:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, matchDate, status) VALUES ('m_081', 'ROUND_32', NULL, 81, '2026-06-30T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, matchDate, status) VALUES ('m_082', 'ROUND_32', NULL, 82, '2026-06-30T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, matchDate, status) VALUES ('m_083', 'ROUND_32', NULL, 83, '2026-06-30T21:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, matchDate, status) VALUES ('m_084', 'ROUND_32', NULL, 84, '2026-06-30T21:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, matchDate, status) VALUES ('m_085', 'ROUND_32', NULL, 85, '2026-07-01T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, matchDate, status) VALUES ('m_086', 'ROUND_32', NULL, 86, '2026-07-01T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, matchDate, status) VALUES ('m_087', 'ROUND_32', NULL, 87, '2026-07-01T21:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, matchDate, status) VALUES ('m_088', 'ROUND_32', NULL, 88, '2026-07-01T21:00:00.000Z', 'SCHEDULED');

-- ROUND_16 (orders 89-96)
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, matchDate, status) VALUES ('m_089', 'ROUND_16', NULL, 89, '2026-07-02T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, matchDate, status) VALUES ('m_090', 'ROUND_16', NULL, 90, '2026-07-02T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, matchDate, status) VALUES ('m_091', 'ROUND_16', NULL, 91, '2026-07-02T21:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, matchDate, status) VALUES ('m_092', 'ROUND_16', NULL, 92, '2026-07-02T21:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, matchDate, status) VALUES ('m_093', 'ROUND_16', NULL, 93, '2026-07-04T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, matchDate, status) VALUES ('m_094', 'ROUND_16', NULL, 94, '2026-07-04T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, matchDate, status) VALUES ('m_095', 'ROUND_16', NULL, 95, '2026-07-04T21:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, matchDate, status) VALUES ('m_096', 'ROUND_16', NULL, 96, '2026-07-04T21:00:00.000Z', 'SCHEDULED');

-- QUARTERS (orders 97-100)
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, matchDate, status) VALUES ('m_097', 'QUARTERS', NULL, 97, '2026-07-08T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, matchDate, status) VALUES ('m_098', 'QUARTERS', NULL, 98, '2026-07-08T21:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, matchDate, status) VALUES ('m_099', 'QUARTERS', NULL, 99, '2026-07-09T18:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, matchDate, status) VALUES ('m_100', 'QUARTERS', NULL, 100, '2026-07-09T21:00:00.000Z', 'SCHEDULED');

-- SEMIS (orders 101-102)
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, matchDate, status) VALUES ('m_101', 'SEMIS', NULL, 101, '2026-07-13T21:00:00.000Z', 'SCHEDULED');
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, matchDate, status) VALUES ('m_102', 'SEMIS', NULL, 102, '2026-07-14T21:00:00.000Z', 'SCHEDULED');

-- THIRD_PLACE (order 103)
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, matchDate, status) VALUES ('m_103', 'THIRD_PLACE', NULL, 103, '2026-07-18T17:00:00.000Z', 'SCHEDULED');

-- FINAL (order 104)
INSERT OR IGNORE INTO "Match" (id, phase, groupLabel, matchOrder, matchDate, status) VALUES ('m_104', 'FINAL', NULL, 104, '2026-07-19T17:00:00.000Z', 'SCHEDULED');

-- ============================================================
-- ADMIN USER
-- ============================================================

INSERT OR IGNORE INTO "User" (id, name, email, password, role, createdAt, updatedAt) VALUES (
  'u_admin',
  'Administrador',
  'admin@bolao.com',
  '$2b$10$H3E9H7oUr44R7QjK8sKCVuGfxoiSwOgq19U7i6X8GeQrDswiWnc5C',
  'admin',
  '2026-01-01T00:00:00.000Z',
  '2026-01-01T00:00:00.000Z'
);

-- ============================================================
-- DEFAULT SETTINGS
-- ============================================================

INSERT OR IGNORE INTO "Settings" (key, value) VALUES ('GROUP_DEADLINE', '2026-06-11T00:00:00.000Z');
INSERT OR IGNORE INTO "Settings" (key, value) VALUES ('CURRENT_PHASE',  'GROUP');
