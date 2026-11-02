# Decisions

## Before results

- readmission: The positive class is patients readmitted to the hospital within 30 days. Missing a positive matters more because failing to identify a patient at risk could prevent them from receiving additional support or follow-up care after discharge.

- diabetes: The positive class is patients with a diabetes diagnosis or HbA1c ≥ 6.5%. Missing a positive matters more because it could delay further testing, diagnosis, and treatment for patients who may have diabetes.

## Recommendations

- readmission: I would not recommend any model for this job because some models miss too many readmitted patients or produce too many false alarms, while others show overfitting. 
- diabetes: I would use logistic regression at a threshold of 0.12 because it reaches 90% sensitivity. It detects 180 of 200 diabetic cases, while producing 364 false alarms and flagging 51.7 people per 100 screened. 

## Design choice and AI use

- design choice: I chose to show the selected threshold beside 0.50 becuase comparing actual patient counts makes the sensitivity/ false-alarm trade-off easier for a clinical lead to understand. 
- AI suggestion I turned down: I rejected the AI suggestion to automatically name a "best" model becuase the appropriate choice depends on the clinical job and the relative importance of missed cases versus false alarms. 
