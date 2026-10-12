// source/presentation/training/training-session.js — Version 4.14
// Responsibility: render the active workout interaction; delegate persistence and business rules to the application layer.
function createElement(tag, className = "", text = null) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== null) element.textContent = text;
    return element;
}

function renderTrainingSession(container, { sessionResult, workout, application, onFinished, onBack, onSessionChange } = {}) {
    if (!container || typeof container.replaceChildren !== "function") throw new TypeError("Training Session: a container element is required.");
    if (!sessionResult?.session || !Number.isSafeInteger(sessionResult.revision)) throw new TypeError("Training Session: a valid session envelope is required.");
    if (!workout || !Array.isArray(workout.exercises) || !application ||
        typeof application.recordSet !== "function" || typeof application.completeWorkout !== "function") {
        throw new TypeError("Training Session: workout and application commands are required.");
    }

    let current = sessionResult;
    let timerId = null;
    const expandedExerciseIds = new Set();
    const addedSetCounts = new Map();

    function getPlannedSetCount(exercise) {
        const definition = workout.exercises.find((item) => item.id === exercise.id) || exercise;
        const requestedSetCount = addedSetCounts.get(exercise.id);
        const targetSets = Math.max(4, Number.isInteger(requestedSetCount)
            ? requestedSetCount
            : Number.isInteger(definition.targetSets) ? definition.targetSets : 4);
        return Math.max(targetSets, exercise.sets.length);
    }

    function getCompletedSetCount(exercise) {
        return exercise.sets.filter((set) => set.completed === true).length;
    }

    const initialCurrentExercise = current.session.exercises.find(
        (exercise) => getCompletedSetCount(exercise) < getPlannedSetCount(exercise)
    );
    let activeExerciseId = initialCurrentExercise?.id ?? null;

    function render() {
        document.body.classList.add("is-training-session-active");
        container.replaceChildren();
        const screen = createElement("section", "training-session training-session--active");
        screen.setAttribute("aria-label", "Активная тренировка");
        const header = createElement("header", "training-session__header");
        const identity = createElement("div", "training-session__identity");
        const eyebrow = createElement("span", "training-session__eyebrow", "ACTIVE SESSION");
        const title = createElement("h3", "training-session__title", workout.title || "Моя тренировка");
        const sessionProgress = createElement("span", "training-session__session-progress");
        identity.append(eyebrow, title, sessionProgress);
        const back = createElement("button", "training-session__back", "‹");
        back.type = "button";
        back.setAttribute("aria-label", "Назад к тренировкам");
        back.addEventListener("click", () => {
            if (typeof onBack === "function") onBack();
        });
        header.append(back, identity);

        const completedSets = current.session.exercises.reduce(
            (total, exercise) => total + getCompletedSetCount(exercise),
            0
        );
        const plannedSets = current.session.exercises.reduce(
            (total, exercise) => total + getPlannedSetCount(exercise),
            0
        );
        const currentExerciseIndex = current.session.exercises.findIndex(
            (exercise) => getCompletedSetCount(exercise) < getPlannedSetCount(exercise)
        );
        const nextCurrentExercise = current.session.exercises[currentExerciseIndex];
        if (nextCurrentExercise && nextCurrentExercise.id !== activeExerciseId) {
            expandedExerciseIds.clear();
            expandedExerciseIds.add(nextCurrentExercise.id);
            activeExerciseId = nextCurrentExercise.id;
        } else if (!nextCurrentExercise) {
            activeExerciseId = null;
        }

        const progress = createElement("section", "training-session__progress");
        progress.setAttribute("aria-label", "Прогресс тренировки");
        sessionProgress.textContent = completedSets + " из " + plannedSets + " подходов";
        const progressBar = document.createElement("progress");
        progressBar.className = "training-session__progress-bar";
        progressBar.max = Math.max(1, plannedSets);
        progressBar.value = completedSets;
        progressBar.setAttribute("aria-label", "Выполненные подходы");
        progress.append(progressBar);

        const exerciseHost = createElement("div", "training-session__exercises");
        current.session.exercises.forEach((exercise, exerciseIndex) => {
            const definition = workout.exercises.find((item) => item.id === exercise.id) || exercise;
            const completedExercise = getCompletedSetCount(exercise) >= getPlannedSetCount(exercise);
            const isCurrentExercise = exerciseIndex === currentExerciseIndex;
            const section = createElement(
                "section",
                "training-session__exercise-card" +
                    (completedExercise ? " training-session__exercise-card--complete" : "") +
                    (isCurrentExercise && expandedExerciseIds.has(exercise.id) ? " training-session__exercise-card--current" : "") +
                    (!completedExercise && (!isCurrentExercise || !expandedExerciseIds.has(exercise.id)) ? " training-session__exercise-card--upcoming" : "")
            );
            if (isCurrentExercise) section.setAttribute("aria-current", "step");
            const top = createElement("div", "training-session__exercise-top");
            const isExpanded = expandedExerciseIds.has(exercise.id);
            top.setAttribute("role", "button");
            top.setAttribute("tabindex", "0");
            top.setAttribute("aria-label", "Раскрыть или скрыть упражнение " + exercise.name);
            top.setAttribute("aria-expanded", String(isExpanded));
            if (isExpanded) section.classList.add("training-session__exercise-card--expanded");
            const heading = createElement("div", "training-session__exercise-heading");
            const exerciseIndexLabel = createElement("span", "training-session__exercise-index", String(exerciseIndex + 1));
            const exerciseTitleBlock = createElement("div", "training-session__exercise-title-block");
            exerciseTitleBlock.append(
                createElement("h4", "training-session__exercise-title", exercise.name),
                createElement("p", "training-session__exercise-progress", getCompletedSetCount(exercise) + " из " + getPlannedSetCount(exercise) + " подходов")
            );
            heading.append(exerciseIndexLabel, exerciseTitleBlock);
            top.append(heading);
            const body = createElement("div", "training-session__exercise-body");
            body.hidden = !isExpanded;
            const rowsCount = getPlannedSetCount(exercise);
            const setHead = createElement(
                "div",
                "training-session__set-head" + (definition.exerciseType === "cardio" ? " training-session__set-head--cardio" : "")
            );
            setHead.setAttribute("aria-hidden", "true");
            setHead.append(
                createElement("span", "training-session__set-head-spacer"),
                createElement("span", "training-session__set-head-number", "ПОДХОД"),
                createElement("span", "training-session__set-head-reps", "ПОВТОРЫ"),
                ...(definition.exerciseType === "cardio" ? [] : [
                    createElement("span", "training-session__set-head-weight", "ВЕС")
                ])
            );
            body.appendChild(setHead);
            for (let index = 0; index < rowsCount; index += 1) {
                const savedSet = exercise.sets[index];
                const row = createElement("div", "training-session__set-row" + (index === 0 && isCurrentExercise ? " is-current" : ""));
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.className = "training-session__set-check";
                checkbox.checked = savedSet?.completed === true;
                checkbox.disabled = Boolean(savedSet);
                checkbox.setAttribute("aria-label", "Подход " + (index + 1) + " выполнен");
                const number = createElement("span", "training-session__set-number", String(index + 1));
                const rowLabel = createElement("span", "training-session__set-row-label", "подход");
                const reps = document.createElement("input");
                reps.type = "number"; reps.min = "1"; reps.max = "100"; reps.step = "1";
                reps.inputMode = "numeric"; reps.className = "training-session__set-reps";
                reps.value = String(savedSet?.reps ?? definition.targetReps ?? 8);
                reps.disabled = Boolean(savedSet);
                reps.setAttribute("aria-label", "Количество повторений, подход " + (index + 1));
                const isCardio = definition.exerciseType === "cardio";
                const resistance = document.createElement("input");
                resistance.type = "number";
                resistance.min = "0";
                resistance.max = "1000";
                resistance.step = "0.5";
                resistance.inputMode = "decimal";
                resistance.className = "training-session__set-weight";
                resistance.placeholder = "0";
                resistance.value = String(savedSet?.resistance?.value ?? definition.targetResistance?.value ?? "");
                resistance.disabled = Boolean(savedSet);
                resistance.setAttribute("aria-label", "Вес в килограммах, подход " + (index + 1));
                const repsField = createElement("label", "training-session__set-field-wrap training-session__set-field-wrap--reps");
                repsField.append(createElement("span", "training-session__set-field-label", "ПОВТОРЫ"));
                const repsControl = createElement("span", "training-session__set-field training-session__set-field--reps");
                repsControl.append(reps, createElement("span", "training-session__set-unit", "ПОВТ."));
                repsField.appendChild(repsControl);
                const weightField = createElement("label", "training-session__set-field-wrap training-session__set-field-wrap--weight");
                weightField.append(createElement("span", "training-session__set-field-label", "ВЕС"));
                const weightControl = createElement("span", "training-session__set-field training-session__set-field--weight");
                weightControl.append(resistance, createElement("span", "training-session__set-weight-unit", "КГ"));
                weightField.appendChild(weightControl);
                if (isCardio) {
                    row.classList.add("training-session__set-row--cardio");
                    row.append(number, rowLabel, repsField, checkbox);
                } else {
                    row.append(number, rowLabel, repsField, weightField, checkbox);
                }
                if (savedSet) row.classList.add("is-complete");
                checkbox.addEventListener("change", async () => {
                    const repetitions = Number(reps.value);
                    const weightText = resistance.value.trim();
                    const weight = weightText === "" ? null : Number(weightText);
                    if (!Number.isInteger(repetitions) || repetitions < 1 || repetitions > 100 ||
                        (!isCardio && weight !== null && (!Number.isFinite(weight) || weight < 0 || weight > 1000))) {
                        checkbox.checked = false;
                        if (!Number.isInteger(repetitions) || repetitions < 1 || repetitions > 100) reps.focus();
                        else if (!isCardio) resistance.focus();
                        return;
                    }
                    checkbox.disabled = true;
                    try {
                        const selectedResistance = isCardio || weight === null
                            ? { unit: "bodyweight", value: null }
                            : { unit: "kg", value: weight };
                        current = await application.recordSet({
                            sessionResult: current,
                            exercise: definition,
                            reps: repetitions,
                            resistance: selectedResistance
                        });
                        if (typeof onSessionChange === "function") onSessionChange(current);
                        render();
                    } catch (error) {
                        checkbox.disabled = false;
                        checkbox.checked = false;
                        const message = screen.querySelector(".training-session__status");
                        if (message) message.textContent = error?.code === "TRAINING_SESSION_CONFLICT"
                            ? "Тренировка изменилась в другом запросе. Обнови экран."
                            : "Не удалось сохранить подход. Попробуй ещё раз.";
                    }
                });
                body.appendChild(row);
            }
            const addSet = createElement("button", "training-session__add-set", "Добавить подход");
            addSet.appendChild(createElement("span", "training-session__add-set-arrow", "›"));
            addSet.hidden = !isExpanded;
            addSet.type = "button";
            addSet.addEventListener("click", () => {
                addedSetCounts.set(exercise.id, rowsCount + 1);
                render();
            });
            const toggleExercise = () => {
                const nextExpanded = body.hidden;
                if (nextExpanded) expandedExerciseIds.add(exercise.id);
                else expandedExerciseIds.delete(exercise.id);
                render();
            };
            top.addEventListener("click", toggleExercise);
            top.addEventListener("keydown", (event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                toggleExercise();
            });
            body.appendChild(addSet);
            section.append(top, body);
            exerciseHost.appendChild(section);
        });

        const footer = createElement("footer", "training-session__footer");
        const status = createElement("p", "training-session__status");
        status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");
        const complete = createElement("button", "training-session__complete");
        const finishFlag = createElement("span", "training-session__complete-flag", "🏁");
        finishFlag.setAttribute("aria-hidden", "true");
        const finishLabel = createElement("span", "training-session__complete-label", "ЗАВЕРШИТЬ ТРЕНИРОВКУ");
        complete.append(finishFlag, finishLabel);
        complete.type = "button";
        complete.disabled = !current.session.exercises.some((exercise) => exercise.sets.some((set) => set.completed === true));
        complete.addEventListener("click", async () => {
            complete.disabled = true;
            complete.setAttribute("aria-busy", "true");
            complete.textContent = "СОХРАНЯЕМ РЕЗУЛЬТАТ…";
            status.className = "training-session__status training-session__status--loading";
            status.textContent = "Сохраняем результат тренировки…";
            try {
                current = await application.completeWorkout({ sessionResult: current });
                if (timerId !== null) window.clearInterval(timerId);
                complete.removeAttribute("aria-busy");
                finishLabel.textContent = "ТРЕНИРОВКА ЗАВЕРШЕНА ✓";
                status.className = "training-session__status training-session__status--success";
                status.textContent = "Тренировка завершена. Результат сохранён.";
                if (typeof onFinished === "function") await onFinished();
            } catch (error) {
                complete.removeAttribute("aria-busy");
                finishLabel.textContent = "ЗАВЕРШИТЬ ТРЕНИРОВКУ";
                status.className = "training-session__status training-session__status--error";
                status.textContent = error?.code === "TRAINING_SESSION_CONFLICT"
                    ? "Тренировка изменилась в другом запросе. Обнови экран перед продолжением."
                    : error?.message || "Не удалось завершить тренировку.";
                complete.disabled = false;
            }
        });
        footer.append(status, complete);
        screen.append(header, progress, exerciseHost, footer);
        container.appendChild(screen);
        if (timerId !== null) {
            window.clearInterval(timerId);
            timerId = null;
        }
    }

    render();
    return () => {
        if (timerId !== null) window.clearInterval(timerId);
        timerId = null;
        document.body.classList.remove("is-training-session-active");
    };
}

export { renderTrainingSession };
