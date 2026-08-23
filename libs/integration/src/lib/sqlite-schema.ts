export const SCHEMA_VERSION = 2;

export const DOMAIN_TABLES: readonly string[] = [
    'meal_entry',
    'meal_group',
    'nutrition_goal',
    'training_set',
    'training_exercise',
    'training',
    'day_note',
    'template_set',
    'template_exercise',
    'training_template',
    'meal_item',
    'meal',
    'training_exercise_strength',
    'training_exercise_cardio',
    'dish',
    'meal_category',
    'exercise',
];

export const SQLITE_SCHEMA_STATEMENTS: readonly string[] = [
    `PRAGMA foreign_keys = ON;`,

    `CREATE TABLE IF NOT EXISTS exercise (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('strength', 'cardio', 'stretching')),
    comment TEXT,
    archived INTEGER NOT NULL DEFAULT 0,
    deleted INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS ux_exercise_name ON exercise (name COLLATE NOCASE) WHERE deleted = 0;`,

    `CREATE TABLE IF NOT EXISTS dish (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    comment TEXT,
    calories_per_100g REAL NOT NULL,
    protein_per_100g REAL NOT NULL DEFAULT 0,
    fat_per_100g REAL NOT NULL DEFAULT 0,
    carbs_per_100g REAL NOT NULL DEFAULT 0,
    archived INTEGER NOT NULL DEFAULT 0,
    deleted INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS ux_dish_name ON dish (name COLLATE NOCASE) WHERE deleted = 0;`,

    `CREATE TABLE IF NOT EXISTS meal_category (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    archived INTEGER NOT NULL DEFAULT 0,
    deleted INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS ux_meal_category_name ON meal_category (name COLLATE NOCASE) WHERE deleted = 0;`,

    `CREATE TABLE IF NOT EXISTS training_template (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    comment TEXT,
    archived INTEGER NOT NULL DEFAULT 0,
    deleted INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

    `CREATE TABLE IF NOT EXISTS template_exercise (
    id TEXT PRIMARY KEY NOT NULL,
    template_id TEXT NOT NULL REFERENCES training_template (id),
    exercise_id TEXT NOT NULL REFERENCES exercise (id),
    sort_order INTEGER NOT NULL,
    comment TEXT,
    deleted INTEGER NOT NULL DEFAULT 0
  );`,

    `CREATE TABLE IF NOT EXISTS template_set (
    id TEXT PRIMARY KEY NOT NULL,
    template_exercise_id TEXT NOT NULL REFERENCES template_exercise (id),
    sort_order INTEGER NOT NULL,
    planned_weight REAL,
    planned_reps INTEGER,
    planned_distance REAL,
    planned_duration INTEGER,
    deleted INTEGER NOT NULL DEFAULT 0
  );`,

    `CREATE TABLE IF NOT EXISTS training (
    id TEXT PRIMARY KEY NOT NULL,
    date TEXT NOT NULL,
    name TEXT,
    comment TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    template_id TEXT REFERENCES training_template (id),
    deleted INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
    `CREATE INDEX IF NOT EXISTS idx_training_date ON training (date) WHERE deleted = 0;`,
    `CREATE INDEX IF NOT EXISTS idx_training_template_id ON training (template_id);`,

    `CREATE TABLE IF NOT EXISTS training_exercise (
    id TEXT PRIMARY KEY NOT NULL,
    training_id TEXT NOT NULL REFERENCES training (id),
    exercise_id TEXT NOT NULL REFERENCES exercise (id),
    sort_order INTEGER NOT NULL,
    comment TEXT,
    source_template_exercise_id TEXT REFERENCES template_exercise (id),
    deleted INTEGER NOT NULL DEFAULT 0
  );`,
    `CREATE INDEX IF NOT EXISTS idx_training_exercise_training ON training_exercise (training_id) WHERE deleted = 0;`,
    `CREATE INDEX IF NOT EXISTS idx_training_exercise_exercise ON training_exercise (exercise_id);`,
    `CREATE INDEX IF NOT EXISTS idx_training_exercise_source ON training_exercise (source_template_exercise_id);`,

    `CREATE TABLE IF NOT EXISTS training_set (
    id TEXT PRIMARY KEY NOT NULL,
    training_exercise_id TEXT NOT NULL REFERENCES training_exercise (id),
    sort_order INTEGER NOT NULL,
    weight REAL,
    reps INTEGER,
    distance REAL,
    duration INTEGER,
    planned_weight REAL,
    planned_reps INTEGER,
    planned_distance REAL,
    planned_duration INTEGER,
    done INTEGER NOT NULL DEFAULT 0,
    done_at TEXT,
    source_template_set_id TEXT REFERENCES template_set (id),
    deleted INTEGER NOT NULL DEFAULT 0,
    CHECK (weight IS NULL OR weight >= 0),
    CHECK (reps IS NULL OR reps >= 0),
    CHECK (distance IS NULL OR distance >= 0),
    CHECK (duration IS NULL OR duration >= 0)
  );`,
    `CREATE INDEX IF NOT EXISTS idx_training_set_exercise ON training_set (training_exercise_id) WHERE deleted = 0;`,
    `CREATE INDEX IF NOT EXISTS idx_training_set_source ON training_set (source_template_set_id);`,

    `CREATE TABLE IF NOT EXISTS day_note (
    date TEXT PRIMARY KEY NOT NULL,
    text TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

    `CREATE TABLE IF NOT EXISTS meal_group (
    id TEXT PRIMARY KEY NOT NULL,
    date TEXT NOT NULL,
    category_id TEXT REFERENCES meal_category (id),
    name TEXT,
    sort_order INTEGER NOT NULL,
    deleted INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    CHECK (category_id IS NULL OR name IS NULL)
  );`,
    `CREATE INDEX IF NOT EXISTS idx_meal_group_date ON meal_group (date) WHERE deleted = 0;`,

    `CREATE TABLE IF NOT EXISTS meal_entry (
    id TEXT PRIMARY KEY NOT NULL,
    group_id TEXT NOT NULL REFERENCES meal_group (id),
    dish_id TEXT REFERENCES dish (id),
    name TEXT NOT NULL,
    grams REAL CHECK (grams IS NULL OR grams > 0),
    calories REAL NOT NULL CHECK (calories >= 0),
    protein REAL NOT NULL DEFAULT 0,
    fat REAL NOT NULL DEFAULT 0,
    carbs REAL NOT NULL DEFAULT 0,
    comment TEXT,
    sort_order INTEGER NOT NULL,
    manually_edited INTEGER NOT NULL DEFAULT 0,
    deleted INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );`,
    `CREATE INDEX IF NOT EXISTS idx_meal_entry_group ON meal_entry (group_id) WHERE deleted = 0;`,
    `CREATE INDEX IF NOT EXISTS idx_meal_entry_dish ON meal_entry (dish_id);`,

    `CREATE TABLE IF NOT EXISTS nutrition_goal (
    id TEXT PRIMARY KEY NOT NULL,
    effective_from TEXT NOT NULL,
    calories REAL NOT NULL CHECK (calories >= 0),
    protein REAL NOT NULL DEFAULT 0,
    fat REAL NOT NULL DEFAULT 0,
    carbs REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS ux_nutrition_goal_date ON nutrition_goal (effective_from);`,
];
