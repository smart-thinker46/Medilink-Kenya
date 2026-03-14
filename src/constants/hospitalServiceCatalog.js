export const HOSPITAL_SERVICE_CATALOG = [
  // Emergency & Critical Care
  { name: "Emergency Care", sw: "Huduma za dharura", category: "Emergency" },
  { name: "Trauma Care", sw: "Huduma za majeraha makubwa", category: "Emergency" },
  { name: "Ambulance Services", sw: "Huduma ya ambulansi", category: "Emergency" },
  { name: "Intensive Care Unit (ICU)", sw: "Chumba cha wagonjwa mahututi", category: "Emergency" },
  { name: "High Dependency Unit (HDU)", sw: "Huduma ya uangalizi wa juu", category: "Emergency" },
  { name: "Critical Care Monitoring", sw: "Ufuatiliaji wa wagonjwa mahututi", category: "Emergency" },

  // General Medical Services
  { name: "General Consultation", sw: "Uchunguzi wa daktari wa kawaida", category: "Other" },
  { name: "Specialist Consultation", sw: "Ushauri wa daktari bingwa", category: "Specialty" },
  { name: "Health Checkups", sw: "Ukaguzi wa afya", category: "Other" },
  { name: "Preventive Healthcare", sw: "Huduma za kuzuia magonjwa", category: "Other" },
  { name: "Chronic Disease Management", sw: "Udhibiti wa magonjwa sugu", category: "Other" },

  // Diagnostic & Imaging Services
  { name: "Laboratory Services", sw: "Huduma za maabara", category: "Diagnostic" },
  { name: "Blood Tests", sw: "Vipimo vya damu", category: "Diagnostic" },
  { name: "Urine Tests", sw: "Vipimo vya mkojo", category: "Diagnostic" },
  { name: "X-Ray", sw: "Picha ya eksirei", category: "Diagnostic" },
  { name: "Ultrasound", sw: "Uchunguzi wa ultrasound", category: "Diagnostic" },
  { name: "CT Scan", sw: "Uchunguzi wa CT Scan", category: "Diagnostic" },
  { name: "MRI Scan", sw: "Uchunguzi wa MRI", category: "Diagnostic" },
  { name: "Mammography", sw: "Uchunguzi wa saratani ya matiti", category: "Diagnostic" },
  { name: "ECG (Heart Test)", sw: "Uchunguzi wa moyo (ECG)", category: "Diagnostic" },
  { name: "Echocardiography", sw: "Uchunguzi wa moyo kwa mawimbi", category: "Diagnostic" },
  { name: "Endoscopy", sw: "Uchunguzi wa tumbo kwa kamera", category: "Diagnostic" },
  { name: "Colonoscopy", sw: "Uchunguzi wa utumbo mpana", category: "Diagnostic" },
  { name: "Lung Function Test", sw: "Vipimo vya mapafu", category: "Diagnostic" },
  { name: "Bone Density Test", sw: "Vipimo vya nguvu ya mifupa", category: "Diagnostic" },
  { name: "Genetic Testing", sw: "Vipimo vya vinasaba", category: "Diagnostic" },

  // Surgery Services
  { name: "General Surgery", sw: "Upasuaji wa kawaida", category: "Treatment" },
  { name: "Laparoscopic Surgery", sw: "Upasuaji mdogo wa matundu", category: "Treatment" },
  { name: "Heart Surgery", sw: "Upasuaji wa moyo", category: "Treatment" },
  { name: "Brain Surgery", sw: "Upasuaji wa ubongo", category: "Treatment" },
  { name: "Orthopedic Surgery", sw: "Upasuaji wa mifupa", category: "Treatment" },
  { name: "Spine Surgery", sw: "Upasuaji wa uti wa mgongo", category: "Treatment" },
  { name: "Plastic Surgery", sw: "Upasuaji wa kurekebisha mwili", category: "Treatment" },
  { name: "Cosmetic Surgery", sw: "Upasuaji wa urembo", category: "Treatment" },
  { name: "Cancer Surgery", sw: "Upasuaji wa saratani", category: "Treatment" },
  { name: "Bariatric Surgery", sw: "Upasuaji wa kupunguza uzito", category: "Treatment" },
  { name: "Transplant Surgery", sw: "Upasuaji wa kupandikiza viungo", category: "Treatment" },

  // Maternity & Women Health
  { name: "Antenatal Care", sw: "Huduma ya wajawazito", category: "Maternal" },
  { name: "Postnatal Care", sw: "Huduma baada ya kujifungua", category: "Maternal" },
  { name: "Normal Delivery", sw: "Kujifungua kawaida", category: "Maternal" },
  { name: "Caesarean Section", sw: "Upasuaji wa kujifungua", category: "Maternal" },
  { name: "Fertility Treatment", sw: "Matibabu ya uzazi", category: "Maternal" },
  { name: "Family Planning", sw: "Uzazi wa mpango", category: "Maternal" },
  { name: "Gynecology Services", sw: "Huduma za wanawake", category: "Maternal" },
  { name: "IVF Treatment", sw: "Matibabu ya uzazi wa IVF", category: "Maternal" },

  // Child Health
  { name: "Pediatric Care", sw: "Huduma za watoto", category: "Specialty" },
  { name: "Neonatal Care", sw: "Huduma za watoto wachanga", category: "Specialty" },
  { name: "Child Vaccination", sw: "Chanjo za watoto", category: "Maternal" },
  { name: "Pediatric Surgery", sw: "Upasuaji wa watoto", category: "Treatment" },

  // Heart Services
  { name: "Cardiology Consultation", sw: "Ushauri wa daktari wa moyo", category: "Specialty" },
  { name: "Heart Disease Treatment", sw: "Matibabu ya magonjwa ya moyo", category: "Treatment" },
  { name: "Cardiac Monitoring", sw: "Ufuatiliaji wa moyo", category: "Diagnostic" },
  { name: "Heart Rehabilitation", sw: "Tiba ya kurejesha afya ya moyo", category: "Treatment" },

  // Kidney Services
  { name: "Dialysis", sw: "Huduma ya dialysis", category: "Treatment" },
  { name: "Kidney Disease Treatment", sw: "Matibabu ya magonjwa ya figo", category: "Treatment" },
  { name: "Kidney Transplant", sw: "Upandikizaji wa figo", category: "Treatment" },
  { name: "Dialysis Support", sw: "Huduma za kusaidia dialysis", category: "Treatment" },

  // Cancer Treatment
  { name: "Cancer Screening", sw: "Uchunguzi wa saratani", category: "Diagnostic" },
  { name: "Chemotherapy", sw: "Matibabu ya saratani kwa dawa", category: "Treatment" },
  { name: "Radiotherapy", sw: "Matibabu ya saratani kwa mionzi", category: "Treatment" },
  { name: "Oncology Consultation", sw: "Ushauri wa daktari wa saratani", category: "Specialty" },

  // Eye Care
  { name: "Eye Examination", sw: "Uchunguzi wa macho", category: "Diagnostic" },
  { name: "Cataract Surgery", sw: "Upasuaji wa mtoto wa jicho", category: "Treatment" },
  { name: "Vision Testing", sw: "Upimaji wa kuona", category: "Diagnostic" },
  { name: "Laser Eye Surgery", sw: "Upasuaji wa macho kwa laser", category: "Treatment" },

  // Dental Services
  { name: "Dental Checkup", sw: "Ukaguzi wa meno", category: "Diagnostic" },
  { name: "Tooth Extraction", sw: "Kung'oa jino", category: "Treatment" },
  { name: "Dental Filling", sw: "Kujaza jino", category: "Treatment" },
  { name: "Root Canal Treatment", sw: "Matibabu ya mzizi wa jino", category: "Treatment" },
  { name: "Braces & Orthodontics", sw: "Kusawazisha meno", category: "Treatment" },

  // Ear, Nose & Throat
  { name: "Hearing Tests", sw: "Vipimo vya kusikia", category: "Diagnostic" },
  { name: "ENT Consultation", sw: "Ushauri wa masikio, pua na koo", category: "Specialty" },
  { name: "Sinus Treatment", sw: "Matibabu ya sinus", category: "Treatment" },

  // Skin Services
  { name: "Skin Treatment", sw: "Matibabu ya ngozi", category: "Treatment" },
  { name: "Acne Treatment", sw: "Matibabu ya chunusi", category: "Treatment" },
  { name: "Skin Allergy Treatment", sw: "Matibabu ya mzio wa ngozi", category: "Treatment" },
  { name: "Cosmetic Dermatology", sw: "Tiba ya ngozi ya urembo", category: "Treatment" },

  // Mental Health
  { name: "Psychiatric Consultation", sw: "Ushauri wa afya ya akili", category: "Specialty" },
  { name: "Depression Treatment", sw: "Matibabu ya msongo wa mawazo", category: "Treatment" },
  { name: "Addiction Treatment", sw: "Matibabu ya uraibu", category: "Treatment" },

  // Rehabilitation Services
  { name: "Physiotherapy", sw: "Tiba ya viungo", category: "Treatment" },
  { name: "Occupational Therapy", sw: "Tiba ya kurejesha uwezo wa kazi", category: "Treatment" },
  { name: "Speech Therapy", sw: "Tiba ya matamshi", category: "Treatment" },

  // Pharmacy & Medication
  { name: "Pharmacy Services", sw: "Huduma ya duka la dawa", category: "Other" },
  { name: "Prescription Dispensing", sw: "Utoaji wa dawa kwa agizo la daktari", category: "Other" },

  // Specialized Treatments
  { name: "Diabetes Care", sw: "Huduma za kisukari", category: "Specialty" },
  { name: "Hypertension Care", sw: "Matibabu ya presha", category: "Specialty" },
  { name: "Obesity Treatment", sw: "Matibabu ya unene kupita kiasi", category: "Treatment" },
  { name: "Pain Management", sw: "Matibabu ya maumivu", category: "Specialty" },
  { name: "Sleep Disorder Treatment", sw: "Matibabu ya matatizo ya usingizi", category: "Specialty" },
  { name: "Sports Medicine", sw: "Matibabu ya majeraha ya michezo", category: "Specialty" },
  { name: "Geriatric Care", sw: "Huduma za wazee", category: "Specialty" },
  { name: "Occupational Health", sw: "Afya ya kazini", category: "Specialty" },
  { name: "Travel Medicine", sw: "Afya ya wasafiri", category: "Specialty" },

  // Preventive & Wellness Services
  { name: "Vaccination", sw: "Chanjo", category: "Other" },
  { name: "Travel Vaccination", sw: "Chanjo za wasafiri", category: "Other" },
  { name: "Nutrition Counseling", sw: "Ushauri wa lishe", category: "Other" },
  { name: "Lifestyle Disease Management", sw: "Udhibiti wa magonjwa ya mtindo wa maisha", category: "Other" },
  { name: "Blood Pressure Monitoring", sw: "Upimaji wa presha", category: "Diagnostic" },
  { name: "Weight Management", sw: "Udhibiti wa uzito", category: "Other" },

  // Other Hospital Services
  { name: "Blood Bank", sw: "Benki ya damu", category: "Other" },
  { name: "Organ Transplant", sw: "Upandikizaji wa viungo", category: "Treatment" },
  { name: "Telemedicine", sw: "Huduma ya matibabu mtandaoni", category: "Other" },
  { name: "Home Healthcare", sw: "Huduma za afya nyumbani", category: "Other" },
  { name: "Medical Counseling", sw: "Ushauri wa matibabu", category: "Other" },
  { name: "Palliative Care", sw: "Huduma kwa wagonjwa mahututi", category: "Treatment" },

  // Public Health Services
  { name: "HIV Testing", sw: "Vipimo vya HIV", category: "Diagnostic" },
  { name: "TB Testing", sw: "Vipimo vya kifua kikuu", category: "Diagnostic" },
  { name: "STI Testing", sw: "Vipimo vya magonjwa ya zinaa", category: "Diagnostic" },

  // Additional Services
  { name: "Burn Treatment", sw: "Matibabu ya majeraha ya moto", category: "Treatment" },
  { name: "Allergy Testing", sw: "Vipimo vya mzio", category: "Diagnostic" },
  { name: "Pain Clinic", sw: "Kliniki ya maumivu", category: "Specialty" },
  { name: "Liver Transplant", sw: "Upandikizaji wa ini", category: "Treatment" },
  { name: "Dialysis Support Services", sw: "Huduma za kusaidia dialysis", category: "Treatment" },
];

export const HOSPITAL_SERVICE_CATEGORIES = [
  "Diagnostic",
  "Treatment",
  "Maternal",
  "Emergency",
  "Specialty",
  "Other",
];
