# Usability Testing Report - Iteration 2

**Date of Testing:** September 15, 2026  
**Tested By:** Frontend Development Team  
**Platform:** SERINEA Web Application (Desktop and Mobile views)  

## 1. Testing Objectives
The primary goal of this usability testing session was to evaluate the user experience of the newly redesigned Home page and the updated Incentives filtering system. Specifically, we wanted to ensure that users could easily navigate to the map, understand the value proposition of SERINEA, and successfully filter regional incentives using the new "Distance from Melbourne" metric.

## 2. Participant Profile
Testing was conducted with three participants who match our target demographic:
*   **Participant 1:** 28-year-old Registered Nurse looking to relocate from Melbourne to a regional town.
*   **Participant 2:** 34-year-old Software Engineer seeking a quieter lifestyle but needing to stay within a 2-hour drive of the city.
*   **Participant 3:** 45-year-old Teacher exploring regional financial incentives for a family relocation.

## 3. Tasks Assigned
Participants were asked to complete the following tasks without guidance:
1.  Navigate the Home page and find the interactive map.
2.  Navigate to the Incentives tab and find financial support available for their specific occupation.
3.  Filter the available incentives to only show towns that are within 150km of Melbourne.
4.  Input a household income of $80,000 to see how it affects their eligibility for certain grants.

## 4. Key Findings and Observations

### Positive Feedback
*   **Visual Appeal:** All three participants praised the new imagery on the Home page (Geelong, Wendouree, and regional Victoria photos). They felt it accurately reflected the "pastoral and editorial" aesthetic of the brand.
*   **Simplified Form:** Participants found the Incentives form highly intuitive. The removal of the confusing "Moving Status" and "Days since move" fields made the process feel much faster and less intrusive.
*   **Distance Filtering:** Participant 2 specifically noted that the "Distance from Melbourne (km)" filter was exactly what they needed, as geographic proximity to the CBD was their primary concern when choosing a regional town.

### Pain Points & Areas of Confusion
*   **Home Page Clutter:** During initial testing, participants were confused by the "Begin" section at the bottom of the Home page. They felt it duplicated the navigation and disrupted the editorial flow of the page.
*   **Data Presentation:** Participant 1 noted that seeing "[MOCK]" in front of every subsidy name made the platform feel unfinished and distracting.
*   **Town Selection:** Participant 3 was unsure what to do if they didn't have a specific town in mind yet and just wanted to browse general incentives.

## 5. Actionable Changes Implemented
Based directly on the usability testing feedback, the frontend team implemented the following changes for the final Iteration 2 build:

1.  **Removed the "Begin" Section:** We completely deleted the redundant "Begin" section from the Home page (`LandingExperience.tsx`). The "Explore" buttons now route users directly to the Map, creating a seamless user journey.
2.  **Cleaned Up Subsidy Names:** We updated the `IncentiveService` to dynamically strip the `[MOCK]` prefix from all subsidy names before rendering them on the frontend, resulting in a much cleaner UI.
3.  **Made Town Selection Optional:** We updated the Incentives form so the "Town" field is explicitly marked as optional. If left blank, the system now automatically groups and displays the top incentives across the best 5 Local Government Areas (LGAs) based on the user's distance and income criteria.
4.  **UI Polish:** We removed harsh borders from the Incentives form card, replacing them with soft shadows and rounded corners (`border-radius: 24px`) to align with the premium editorial design system.