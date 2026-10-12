-- LifeGame: allow bodyweight as a distinct exercise category while preserving legacy categories.
alter table public.training_exercises
    drop constraint if exists training_exercises_exercise_type_check;
alter table public.training_exercises
    add constraint training_exercises_exercise_type_check
    check (exercise_type in ('cardio', 'strength', 'bodyweight'));
