# Cleans the OSHA Severe Injury Reports and MSHA Accidents data.
# Output files go to clean/ with columns:
#   record_id, date, text, source, industry, event_type, equipment, outcome

import zipfile
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent
RAW = ROOT / "raw"
CLEAN = ROOT / "clean"

OSHA_ZIP = RAW / "January2015toNovember2025.zip"
MSHA_ZIP = RAW / "Accidents.zip"
MSHA_DEFINITION = RAW / "definition-msha.txt"

MIN_TEXT_LEN = 30
OIL_GAS_NAICS_PREFIXES = ("211", "213111", "324", "486")
COMMON_COLUMNS = ["record_id", "date", "text", "source", "industry", "event_type", "equipment", "outcome"]
# MSHA uses these placeholders for "no data"
MSHA_MISSING = {"?", "NO VALUE FOUND", "No Value Found", "NO VALUE FOUND."}
TOP_N_PRINT = 30


def extract(zip_path: Path) -> Path:
    # Unzip the data file if it isn't already extracted
    with zipfile.ZipFile(zip_path) as zf:
        name = zf.namelist()[0]
        target = zip_path.parent / name
        if not target.exists():
            print(f"Extracting {zip_path.name} -> {name}")
            zf.extract(name, zip_path.parent)
    return target


def read_text_table(path: Path, **kwargs) -> pd.DataFrame:
    # Read the file as text (falls back to cp1252 if not UTF-8)
    try:
        return pd.read_csv(path, dtype=str, encoding="utf-8", **kwargs)
    except UnicodeDecodeError:
        return pd.read_csv(path, dtype=str, encoding="cp1252", **kwargs)


def strip_whitespace(df: pd.DataFrame) -> pd.DataFrame:
    # Trim text columns and collapse extra whitespace
    for col in df.columns:
        if df[col].dtype == object:
            df[col] = df[col].str.replace(r"\s+", " ", regex=True).str.strip()
    return df.replace("", pd.NA)


def finalize(df: pd.DataFrame, name: str) -> pd.DataFrame:
    # Common cleaning: whitespace, empty narratives, duplicates
    n0 = len(df)
    df = strip_whitespace(df)
    df = df[df["text"].fillna("").str.len() >= MIN_TEXT_LEN]
    n1 = len(df)
    # Remove duplicates (ignoring record_id)
    df = df.drop_duplicates(subset=[c for c in COMMON_COLUMNS if c != "record_id"])
    n2 = len(df)
    print(f"[{name}] {n0:,} rows -> {n1:,} after narrative filter "
          f"(-{n0 - n1:,}) -> {n2:,} after dedupe (-{n1 - n2:,})")
    return df[COMMON_COLUMNS].reset_index(drop=True)


# OSHA

def osha_outcome(row) -> str:
    # Combine OSHA's severity flags into one outcome
    parts = []
    for col in ("Amputation", "Loss of Eye", "Hospitalized"):
        try:
            if float(row[col]) > 0:
                parts.append(col)
        except (TypeError, ValueError):
            pass
    return "; ".join(parts) if parts else "None reported"


def clean_osha() -> pd.DataFrame:
    raw = read_text_table(extract(OSHA_ZIP))
    df = pd.DataFrame({
        "record_id": raw["ID"],
        "date": pd.to_datetime(raw["EventDate"], errors="coerce").dt.strftime("%Y-%m-%d"),
        "text": raw["Final Narrative"],
        "source": "OSHA",
        "industry": raw["Primary NAICS"].str.strip().str.replace(r"\.0$", "", regex=True),
        "event_type": raw["EventTitle"],
        "equipment": raw["SourceTitle"],
        "outcome": raw.apply(osha_outcome, axis=1),
    })
    return finalize(df, "OSHA")


# MSHA

def load_msha_definition() -> dict:
    # MSHA column name -> description from the definition file
    d = pd.read_csv(MSHA_DEFINITION, sep="|", dtype=str)
    return dict(zip(d["COLUMN_NAME"], d["FIELD_DESCRIPTION"]))


def clean_msha() -> pd.DataFrame:
    definition = load_msha_definition()
    # Columns used:
    #   NARRATIVE       narrative description of the accident
    #   COAL_METAL_IND  coal vs metal/non-metal mine (MSHA's only industry split)
    #   ACCIDENT_TYPE   event which directly resulted in the injury (analogue of OSHA EventTitle)
    #   INJURY_SOURCE   object/substance that inflicted the injury (analogue of OSHA SourceTitle)
    #   DEGREE_INJURY   outcome, incl. fatality and permanent disability
    usecols = ["DOCUMENT_NO", "ACCIDENT_DT", "NARRATIVE", "COAL_METAL_IND",
               "ACCIDENT_TYPE", "INJURY_SOURCE", "DEGREE_INJURY"]
    missing = [c for c in usecols if c not in definition]
    if missing:
        raise KeyError(f"Columns not in MSHA definition file: {missing}")

    raw = read_text_table(extract(MSHA_ZIP), sep="|", usecols=usecols, on_bad_lines="warn")
    raw = raw.apply(lambda s: s.str.strip()).mask(lambda d: d.isin(MSHA_MISSING))

    df = pd.DataFrame({
        "record_id": raw["DOCUMENT_NO"],
        "date": pd.to_datetime(raw["ACCIDENT_DT"], format="%m/%d/%Y", errors="coerce").dt.strftime("%Y-%m-%d"),
        "text": raw["NARRATIVE"],
        "source": "MSHA",
        "industry": raw["COAL_METAL_IND"].map({"C": "Mining - Coal", "M": "Mining - Metal/Non-Metal"}),
        "event_type": raw["ACCIDENT_TYPE"],
        "equipment": raw["INJURY_SOURCE"],
        "outcome": raw["DEGREE_INJURY"],
    })
    return finalize(df, "MSHA")


# reporting

def report_counts(df: pd.DataFrame, name: str) -> None:
    # Print top value counts and save them to clean/
    for col in ("outcome", "event_type"):
        counts = df[col].value_counts(dropna=False)
        counts.rename_axis(col).reset_index(name="count").to_csv(
            CLEAN / f"value_counts_{name}_{col}.csv", index=False)
        print(f"\n=== {name}: {col} ({counts.size} distinct values, top {TOP_N_PRINT}) ===")
        print(counts.head(TOP_N_PRINT).to_string())


def main() -> None:
    CLEAN.mkdir(exist_ok=True)

    osha = clean_osha()
    osha.to_csv(CLEAN / "osha_clean.csv", index=False)
    oil_gas = osha[osha["industry"].fillna("").str.startswith(OIL_GAS_NAICS_PREFIXES)]
    oil_gas.to_csv(CLEAN / "osha_oil_gas.csv", index=False)
    print(f"[OSHA] oil & gas subset: {len(oil_gas):,} rows")

    msha = clean_msha()
    msha.to_csv(CLEAN / "msha_clean.csv", index=False)

    report_counts(osha, "osha")
    report_counts(oil_gas, "osha_oil_gas")
    report_counts(msha, "msha")


if __name__ == "__main__":
    main()
