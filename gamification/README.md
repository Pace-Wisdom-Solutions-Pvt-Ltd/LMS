# Gamification Module

## 1. Overview
The `gamification` module tracks learner engagement and progression through experience points (XP) and level advancement as learners complete learning activities and quizzes.

## 2. Models
- **`GamificationProfile` (`gamification.models.GamificationProfile`)**:
  - `user`: OneToOneField to `accounts.User`.
  - `total_points`: Total cumulative experience points earned.
  - `current_level`: Current progression level (calculated dynamically based on XP).
  - `rank`: Optional leaderboard rank within the system.

## 3. Signals (`gamification.signals`)
- **Auto-Provisioning**: A post-save signal listens for new `accounts.User` creation and automatically initializes a `GamificationProfile` with 0 points and Level 1 status.
- **XP Progression**: Listens for course completion and task/quiz grading events to award experience points and recalculate the learner's current level.

## 4. API & Integration
- Profile data is integrated into the user profile response (`/api/users/me/`) and student summaries.
- Provides public methods on `GamificationProfile` for programmatic XP rewards:
  - `add_points(points)`: Increments total points and triggers level updates.

## 5. Level Calculation Algorithm
- Level calculations follow a predictable milestone progression curve:
  $$\text{Level} = \lfloor \frac{\text{XP}}{100} \rfloor + 1$$
- Ensures consistent progression feedback as students complete content.

## 6. Business Logic & Invariants
- Each user has exactly one `GamificationProfile`.
- Profiles are persistent across all organizations the user participates in.

## 7. Dependencies
- Django core ORM and signals framework.
- `accounts` app.

## 8. Testing & Verification
Tests are located in `gamification/tests/`:
```bash
poetry run pytest gamification/ -p no:cacheprovider --no-cov -q
```
Verifies signal-based profile creation, XP updates, and level recalculation.
