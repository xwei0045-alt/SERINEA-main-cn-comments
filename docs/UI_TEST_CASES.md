# Frontend UI Test Cases - Iteration 2

This document outlines the manual UI test cases executed against the SERINEA frontend to verify that the Acceptance Criteria defined in LeanKit have been met.

| Test ID | Feature | Action / Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **UI-01** | Security / Access | Navigate to the live SERINEA URL without being authenticated. | The browser prompts for Basic Authentication. The site cannot be accessed without credentials. | ✅ Pass |
| **UI-02** | Security / Access | Enter username `admin` and password `password123` in the auth prompt. | The user is granted access to the Home page and all assets (images, CSS) load correctly. | ✅ Pass |
| **UI-03** | Home Page Navigation | Scroll through the Home page and click the "Explore" button in the Hero section. | The user is immediately routed to the `/map` page. | ✅ Pass |
| **UI-04** | Home Page Visuals | Inspect the Home page images on both Desktop and Mobile views. | The Geelong image loads in the hero section. The Wendouree and regional Victoria images load in the lower sections. No broken image links are present. | ✅ Pass |
| **UI-05** | Incentives Form | Navigate to `/incentives`. Click the "Your job" input field. | A dropdown appears containing an expanded list of occupations including "Software Engineer", "General Practitioner", and "Chef". | ✅ Pass |
| **UI-06** | Incentives Distance Filter | On the Incentives page, leave the Town field blank. Open "More details". Enter `150` in the "Distance from Melbourne (km)" field. Click "Find incentives". | The results display up to 5 LGAs. All displayed LGAs are geographically located within 150km of Melbourne (calculated via Haversine formula). | ✅ Pass |
| **UI-07** | Incentives Income Filter | Enter `80000` in the "Household income / year" field. Leave the town blank. Click "Find incentives". | Subsidies that have a strict income limit below $80,000 are filtered out or marked as failed. The highest-paying eligible subsidies are ranked at the top. | ✅ Pass |
| **UI-08** | Incentives UI Rendering | Inspect the rendered Incentive cards in the results section. | The `[MOCK]` prefix is completely absent from the subsidy titles. The cards render with soft shadows and rounded corners. | ✅ Pass |
| **UI-09** | Incentives Form Cleanup | Inspect the Incentives form inputs. | The "Moving Status", "New resident", and "Days since move" fields are completely absent from the UI. | ✅ Pass |

**Testing Sign-off:**
All UI test cases for Iteration 2 have passed successfully against the `main` branch build.