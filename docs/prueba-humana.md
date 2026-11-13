# Human test: does a person understand the scene?

The comprehension eval (`npm run eval:comprension`) measures what a small model gets from a scene's text. It cannot see what a person sees: where the eye goes, what the animation hides, which word stops them. This protocol puts a scene in front of three people of the target audience and records where they get lost. Use it for the scenes named in the plan (F22 baseline, F30 result) and whenever a scene changes how it explains.

The only thing under test is the scene. Say so to every person: "If you do not understand something, the scene is wrong, not you."

## Before the session

1. **Pick the scene and its audience.** Each bench topic names its audience in `evals/bench/<id>/topic.json`. Three people who fit it and who **do not know the topic** (ask first: "Have you studied or worked with this?"; if yes, find someone else). Never use someone who saw the scene being written.
2. **Open it in Present.** `npm run preview -- evals/bench/<id>/scene.exl.md --project evals/bench/<id>` (or the project folder the topic names), then press **Present**. Full screen, subtitles on, sound as the person likes. Check once yourself that it plays to the end.
3. **Print the questions.** `npm run eval:comprension -- --print --topics <id>` writes the five questions the way the model sees them, with the answers at the end. Give the person the questions **without** the answers line.
4. **Print the notes template** (below), one copy per person. A second person taking notes is better than you doing both; if you are alone, record the screen and the voice with the person's consent.

## The session (about 15 minutes)

Say, in the person's language and in these words or close to them:

> "I am going to show you something that explains `<the topic's title>`. Nobody will explain it to you and I will not answer questions about the content. Think aloud as you go: say what you notice, what you expect and when something does not make sense. You can go back and forward with the arrow keys. Tell me when you are done."

Then:

1. **Watch.** Let them go through the scene at their own pace with ← and →. You do not explain, hint, nod or say "yes, that is right". When they ask something, answer "What do you think it means?" or "Write it down, we will come back to it". Note the **slide number** and the **time** whenever they:
   - stop for more than five seconds on one slide, or go back;
   - frown, laugh, sigh or look away from the screen;
   - say "what?", "why?" or "I do not get this";
   - read a word aloud as if testing it;
   - do not look at the part that is animating, or watch the decoration instead of the content.
2. **Explain it back (2 minutes).** "Explain to me, in your own words, what this was about, as if I did not know." Do not interrupt. Note the sentences that are right, wrong and missing.
3. **Answer the questions (5 minutes).** They answer the five questions on paper, without going back to the scene and without help. Do not tell them the score.
4. **Interview (3 minutes).** Ask each of these and write what they say, not what you think they meant:
   - "Which was the clearest moment? Which was the most confusing?"
   - "Was there a word you did not know? Where?"
   - "Was there anything on the screen that distracted you?"
   - "What would you have wanted to see that was not there?"

## Notes template

Copy it per person.

```
Scene: ______________   Person: P1 / P2 / P3   Audience fit: ______   Date: ______
Had studied the topic before? yes / no (if yes, discard)

Where they got lost (one row per moment)
| Slide | Time | What I saw or heard (their words) | Cause |
|-------|------|-----------------------------------|-------|
|       |      |                                   |       |

Cause: T = a term or acronym not defined yet · E = no example before the idea · M = too much on one slide
       P = the picture does not show the idea · A = the animation hid or distracted · D = decoration in the way
       S = the subtitle does not match what is lit · O = other (say)

Their explanation in their own words: right / wrong / missing
  right:
  wrong:
  missing:

Questions (circle what they answered; leave the key out until the end)
  1 ____  2 ____  3 ____  4 ____  5 ____      Right: ___ / 5

Interview
  clearest:
  most confusing:
  unknown word:
  distraction:
  missing:
```

## Reading the results

- **Score**: right answers out of 5 per person, then the mean for the scene. Compare it with the model's *with the scene* score for the same topic (`summary.md` of the comprehension eval) and with the model's *without the scene* score, which is what a person with no explanation would get by guessing and common sense.
- **Where people got lost**: count the rows by cause and by slide. A slide where two of three people got lost is a defect of the scene, whatever the model scored. A cause that repeats across scenes is a defect of the skill, and is what the next phase should fix.
- **Done** means, for each scene tested: at least two of three explain the central idea correctly in their own words and answer at least four of five questions, without help.
- Write the table and the three most common causes in the phase's report (`docs/resultados-f30.md` for F30). Keep the filled templates in a folder outside the repository if they carry names.
- Do not change a scene between people. Fix it after the three, and test with three new people if the fix is large.
