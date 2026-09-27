# Cleans the OSHA ITA Case Detail Data (2025).
# Output files go to clean/ with the same columns as clean_data.py.
# event_type and equipment may be empty if the file has no OIICS codes yet.

import re

import pandas as pd

from clean_data import CLEAN, OIL_GAS_NAICS_PREFIXES, RAW, finalize, read_text_table, report_counts

ITA_CSV = RAW / "ITA_Case_Detail_Data_2025_through_3-15-2026.csv"

# Narrative fields, joined in this order to build the text
NARRATIVE_FIELDS = [
    "New_nar_before_incident",
    "New_nar_what_happened",
    "New_incident_description",
    "New_nar_injury_illness",
    "New_nar_object_substance",
]
OIICS_FIELDS = {
    "event_type": "Event_title_pred",
    "equipment": "Source_title_pred",
}
OUTCOMES = {
    "1": "Death",
    "2": "Days away from work",
    "3": "Job transfer or restriction",
    "4": "Other recordable case",
}

# Matches [REDACTED] markers, including cut-off ones like "[REDACT"
REDACTED = re.compile(r"[\[(]?\s*redacted\s*[\])]?|\[redac?t?e?d?$", re.IGNORECASE)
# Answers that mean "no information"
PLACEHOLDERS = {"", "na", "none", "unknown", "unk", "notapplicable", "notavailable", "nothing", "other"}


def clean_field(value) -> str:
    # Remove redaction markers and placeholder answers
    if not isinstance(value, str):
        return ""
    value = re.sub(r"\s+", " ", REDACTED.sub(" ", value)).strip(" ,;:-")
    return "" if re.sub(r"[^a-z]", "", value.lower()) in PLACEHOLDERS else value


def combine_narrative(parts) -> str:
    # Join fields into one text, skipping repeats
    sentences, seen = [], ""
    for part in map(clean_field, parts):
        key = part.lower()
        if not part or key in seen:
            continue
        sentences.append(part if part[-1] in ".!?" else part + ".")
        seen += " " + key
    return " ".join(sentences)


def clean_ita() -> pd.DataFrame:
    header = pd.read_csv(ITA_CSV, nrows=0, encoding="latin-1").columns
    oiics = {k: v for k, v in OIICS_FIELDS.items() if v in header}
    if len(oiics) < len(OIICS_FIELDS):
        print(f"[ITA] OIICS columns not in file (not yet released for 2025): "
              f"{[v for v in OIICS_FIELDS.values() if v not in header]}")

    usecols = ["ID", "date_of_incident", "naics_code", "incident_outcome", *NARRATIVE_FIELDS, *oiics.values()]
    raw = read_text_table(ITA_CSV, usecols=usecols)

    df = pd.DataFrame({
        "record_id": raw["ID"],
        "date": pd.to_datetime(raw["date_of_incident"], format="%m/%d/%Y", errors="coerce").dt.strftime("%Y-%m-%d"),
        "text": [combine_narrative(row) for row in raw[NARRATIVE_FIELDS].itertuples(index=False)],
        "source": "OSHA_ITA",
        "industry": raw["naics_code"].str.strip().str.replace(r"\.0$", "", regex=True),
        "event_type": raw[oiics["event_type"]] if "event_type" in oiics else pd.NA,
        "equipment": raw[oiics["equipment"]] if "equipment" in oiics else pd.NA,
        "outcome": raw["incident_outcome"].str.strip().map(OUTCOMES),
    })
    return finalize(df, "ITA")


def main() -> None:
    CLEAN.mkdir(exist_ok=True)

    ita = clean_ita()
    ita.to_csv(CLEAN / "ita_clean.csv", index=False)
    oil_gas = ita[ita["industry"].fillna("").str.startswith(OIL_GAS_NAICS_PREFIXES)]
    oil_gas.to_csv(CLEAN / "ita_oil_gas.csv", index=False)
    print(f"[ITA] oil & gas subset: {len(oil_gas):,} rows")
    print(oil_gas["industry"].str[:3].value_counts().rename("rows by NAICS prefix").to_string())

    report_counts(ita, "ita")
    report_counts(oil_gas, "ita_oil_gas")


if __name__ == "__main__":
    main()
