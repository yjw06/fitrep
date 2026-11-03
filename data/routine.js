// 루틴 원본 — tools/import-routine.mjs로 생성(주 5회 부위별 루틴, 2026-11-03).
// 손으로 고치지 말고 JSON을 바꿔 다시 생성할 것. 앱 쪽 보충(대체 종목·로드맵 처방)은 data/program.js
export default {
  "schemaVersion": 1,
  "name": "주 5회 부위별 루틴",
  "updated": "2026-11-03",
  "goal": "기계체조 선수형 몸 — 어깨·팔·등·가슴·복근 우선, 기구 운동 위주",
  "sessionLimitMin": 60,
  "notes": [
    "체력단련(2.8km 업힐·팔굽·윗몸)은 몸풀기로 보고 볼륨·피로 계산에 넣지 않는다",
    "요일을 바꿀 땐 삼두를 같이 쓰는 가슴·어깨·팔을 연달아 두지 않는다",
    "혼자 하는 벤치·스쿼트는 실패까지 가지 않는다"
  ],
  "intensity": {
    "main": {
      "label": "메인",
      "reps": "4~8",
      "rir": [
        2,
        2
      ],
      "lastSetOnly": false,
      "cue": "마지막 1~2회가 눈에 띄게 느려지지만 자세는 그대로"
    },
    "accessory": {
      "label": "보조",
      "reps": "8~12",
      "rir": [
        1,
        2
      ],
      "lastSetOnly": false,
      "cue": "마지막 회가 힘들어도 반동 없이 끝까지"
    },
    "isolation": {
      "label": "고립",
      "reps": "10~20",
      "rir": [
        0,
        1
      ],
      "lastSetOnly": true,
      "cue": "한 개 더 하면 자세가 무너질 정도"
    },
    "assisted": {
      "label": "어시스트",
      "reps": "6~10",
      "rir": [
        1,
        2
      ],
      "lastSetOnly": false,
      "cue": "무게 대신 보조 무게를 바꿔 맞춘다"
    },
    "negative": {
      "label": "네거티브",
      "reps": "3",
      "rir": null,
      "lastSetOnly": false,
      "cue": "5초 동안 천천히 못 내려오면 그 세트 끝"
    }
  },
  "firstWeek": {
    "rir": 3,
    "rule": "시작 무게로 정해진 반복을 했는데 3개 넘게 남으면 다음 세트에 올린다",
    "bumpKg": {
      "upper": [
        2.5,
        5
      ],
      "lower": [
        5,
        10
      ]
    }
  },
  "warmup": {
    "general": {
      "minutes": 5,
      "upper": "가벼운 랫풀다운 15회 → 가벼운 케이블 로우 15회",
      "lower": "빈봉 스쿼트 10회",
      "skipIfRightAfterPT": true
    },
    "mainLift": [
      "빈봉 10회",
      "본세트 무게의 50% × 5",
      "70% × 3",
      "85% × 1",
      "본세트"
    ]
  },
  "rules": [
    {
      "id": "stall",
      "when": "2주 연속 반복 수 제자리",
      "change": "무게 10% 내려서 다시"
    },
    {
      "id": "deload",
      "when": "5주마다 1주",
      "change": "무게 유지, 세트 수 절반"
    },
    {
      "id": "overtime",
      "when": "60분을 넘길 것 같을 때",
      "change": "마지막 슈퍼세트를 1세트 줄인다"
    }
  ],
  "days": [
    {
      "id": "mon",
      "weekday": 1,
      "title": "가슴 + 복근",
      "estMin": 55,
      "warmup": "upper",
      "blocks": [
        {
          "type": "single",
          "restSec": 150,
          "restText": "2~3분",
          "exercises": [
            {
              "id": "bench_press",
              "name": "바벨 벤치프레스",
              "category": "main",
              "equipment": "barbell",
              "sets": 4,
              "reps": {
                "min": 5,
                "max": 6
              },
              "rir": [
                2,
                2
              ],
              "targets": {
                "primary": [
                  "가슴 중부"
                ],
                "secondary": [
                  "어깨 전면",
                  "삼두"
                ]
              },
              "cue": "견갑을 모으고 내린 채 고정, 바는 유두선 아래로",
              "start": {
                "kg": 40
              },
              "increment": {
                "kg": 2.5
              },
              "warmupSets": true
            }
          ]
        },
        {
          "type": "single",
          "restSec": 120,
          "restText": "2분",
          "exercises": [
            {
              "id": "incline_press_machine",
              "name": "인클라인 벤치프레스 머신",
              "category": "accessory",
              "equipment": "machine",
              "sets": 3,
              "reps": {
                "min": 8,
                "max": 10
              },
              "rir": [
                1,
                2
              ],
              "targets": {
                "primary": [
                  "가슴 상부"
                ],
                "secondary": [
                  "어깨 전면"
                ]
              },
              "cue": "위로 미는 각도가 쇄골부 섬유 방향",
              "start": null,
              "increment": {
                "step": "machine"
              }
            }
          ]
        },
        {
          "type": "single",
          "restSec": 120,
          "restText": "2분",
          "exercises": [
            {
              "id": "assisted_dip",
              "name": "어시스트 딥스 (상체 30° 숙여)",
              "category": "assisted",
              "equipment": "assisted_machine",
              "sets": 3,
              "reps": {
                "min": 8,
                "max": 10
              },
              "rir": [
                2,
                2
              ],
              "targets": {
                "primary": [
                  "가슴 하부"
                ],
                "secondary": [
                  "삼두"
                ]
              },
              "cue": "위팔이 바닥과 평행할 때까지만 내려간다. 어깨 앞쪽이 불편하면 싱글암 하이투로우 케이블 플라이 3×12~15로 바꾼다",
              "start": {
                "assistKg": 20
              },
              "increment": {
                "assistKg": -5,
                "when": "3×10 달성"
              }
            }
          ]
        },
        {
          "type": "superset",
          "restSec": 60,
          "restText": "60초",
          "exercises": [
            {
              "id": "low_to_high_cable_fly",
              "name": "로우-투-하이 케이블 플라이",
              "category": "isolation",
              "equipment": "cable",
              "sets": 3,
              "reps": {
                "min": 12,
                "max": 15
              },
              "rir": [
                0,
                1
              ],
              "targets": {
                "primary": [
                  "가슴 상부"
                ],
                "secondary": []
              },
              "cue": "아래에서 위로 모은다",
              "start": null,
              "increment": {
                "step": "machine"
              }
            },
            {
              "id": "pec_deck_fly",
              "name": "펙덱 플라이",
              "category": "isolation",
              "equipment": "machine",
              "sets": 3,
              "reps": {
                "min": 12,
                "max": 15
              },
              "rir": [
                0,
                1
              ],
              "targets": {
                "primary": [
                  "가슴 중부"
                ],
                "secondary": []
              },
              "cue": "모은 끝에서 1초 쥐어짠다",
              "start": null,
              "increment": {
                "step": "machine"
              }
            }
          ]
        },
        {
          "type": "single",
          "restSec": 45,
          "restText": "45초",
          "exercises": [
            {
              "id": "cable_crunch",
              "name": "케이블 크런치 (로프, 무릎 꿇고)",
              "category": "isolation",
              "equipment": "cable",
              "sets": 3,
              "reps": {
                "min": 10,
                "max": 15
              },
              "rir": [
                0,
                1
              ],
              "targets": {
                "primary": [
                  "복직근"
                ],
                "secondary": []
              },
              "cue": "골반은 고정하고 갈비뼈를 골반 쪽으로 말아 내린다",
              "start": null,
              "increment": {
                "step": "machine"
              }
            }
          ]
        }
      ],
      "notes": [
        "벤치 거치대가 없으면 스미스 벤치로 대체한다",
        "슈퍼세트는 두 운동을 연달아 한 뒤 한 번만 쉰다"
      ]
    },
    {
      "id": "tue",
      "weekday": 2,
      "title": "등",
      "estMin": 58,
      "warmup": "upper",
      "blocks": [
        {
          "type": "single",
          "restSec": 90,
          "restText": "90초",
          "exercises": [
            {
              "id": "negative_pullup",
              "name": "네거티브 풀업 (5초 하강)",
              "category": "negative",
              "equipment": "pullup_bar",
              "sets": 3,
              "reps": {
                "min": 3,
                "max": 3
              },
              "rir": null,
              "eccentricSec": 5,
              "targets": {
                "primary": [
                  "광배근"
                ],
                "secondary": [
                  "이두"
                ]
              },
              "cue": "내려오는 힘이 더 커서 못 올라가도 연습이 된다",
              "start": null,
              "increment": {
                "rule": "3×3이 수월해지면 3×5 → 하강 8초"
              }
            }
          ]
        },
        {
          "type": "single",
          "restSec": 180,
          "restText": "3분",
          "exercises": [
            {
              "id": "deadlift",
              "name": "컨벤셔널 데드리프트",
              "category": "main",
              "equipment": "barbell",
              "sets": 3,
              "reps": {
                "min": 4,
                "max": 5
              },
              "rir": [
                2,
                2
              ],
              "targets": {
                "primary": [
                  "척추기립근"
                ],
                "secondary": [
                  "대둔근",
                  "햄스트링"
                ]
              },
              "cue": "바를 정강이에 붙이고 등은 중립",
              "start": {
                "kg": 60
              },
              "increment": {
                "kg": 5
              },
              "warmupSets": true
            }
          ]
        },
        {
          "type": "single",
          "restSec": 120,
          "restText": "2분",
          "exercises": [
            {
              "id": "assisted_pullup",
              "name": "어시스트 풀업 (어깨너비 오버그립)",
              "category": "assisted",
              "equipment": "assisted_machine",
              "sets": 3,
              "reps": {
                "min": 6,
                "max": 8
              },
              "rir": [
                1,
                2
              ],
              "targets": {
                "primary": [
                  "광배근"
                ],
                "secondary": [
                  "이두"
                ]
              },
              "cue": "턱걸이와 같은 궤적으로 볼륨을 쌓는다",
              "start": {
                "assistKg": [
                  20,
                  30
                ]
              },
              "increment": {
                "assistKg": -5,
                "when": "3×8 달성"
              }
            }
          ]
        },
        {
          "type": "single",
          "restSec": 90,
          "restText": "90초",
          "exercises": [
            {
              "id": "t_bar_row",
              "name": "티바로우",
              "category": "accessory",
              "equipment": "machine",
              "sets": 3,
              "reps": {
                "min": 8,
                "max": 10
              },
              "rir": [
                1,
                2
              ],
              "targets": {
                "primary": [
                  "등 중앙"
                ],
                "secondary": [
                  "어깨 후면"
                ]
              },
              "cue": "팔꿈치 45°로 당기고 끝에서 견갑을 모은다",
              "start": null,
              "increment": {
                "step": "machine"
              }
            }
          ]
        },
        {
          "type": "single",
          "restSec": 90,
          "restText": "90초",
          "exercises": [
            {
              "id": "wide_lat_pulldown",
              "name": "와이드 랫풀다운",
              "category": "accessory",
              "equipment": "machine",
              "sets": 3,
              "reps": {
                "min": 8,
                "max": 10
              },
              "rir": [
                1,
                2
              ],
              "targets": {
                "primary": [
                  "광배근"
                ],
                "secondary": []
              },
              "cue": "팔꿈치를 옆구리로 끌어내린다",
              "start": null,
              "increment": {
                "step": "machine"
              }
            }
          ]
        },
        {
          "type": "single",
          "restSec": 75,
          "restText": "75초",
          "exercises": [
            {
              "id": "cable_seated_row",
              "name": "케이블 시티드 로우 (V그립)",
              "category": "accessory",
              "equipment": "cable",
              "sets": 3,
              "reps": {
                "min": 10,
                "max": 12
              },
              "rir": [
                1,
                2
              ],
              "targets": {
                "primary": [
                  "등 중앙"
                ],
                "secondary": [
                  "어깨 후면"
                ]
              },
              "cue": "팔꿈치를 몸통에 붙여 뒤로 당긴다",
              "start": null,
              "increment": {
                "step": "machine"
              }
            }
          ]
        }
      ],
      "notes": [
        "시티드 로우 기구가 없으면 케이블 머신 아래 도르래 + 벤치로 한다"
      ]
    },
    {
      "id": "wed",
      "weekday": 3,
      "title": "어깨",
      "estMin": 50,
      "warmup": "upper",
      "blocks": [
        {
          "type": "single",
          "restSec": 150,
          "restText": "2분30초",
          "exercises": [
            {
              "id": "standing_ohp",
              "name": "스탠딩 바벨 오버헤드 프레스",
              "category": "main",
              "equipment": "barbell",
              "sets": 4,
              "reps": {
                "min": 5,
                "max": 6
              },
              "rir": [
                2,
                2
              ],
              "targets": {
                "primary": [
                  "어깨 전면"
                ],
                "secondary": [
                  "어깨 측면",
                  "삼두"
                ]
              },
              "cue": "서서 밀어 코어까지 동원, 바는 얼굴 앞으로 곧게",
              "start": {
                "kg": 25
              },
              "increment": {
                "kg": 2.5
              },
              "warmupSets": true
            }
          ]
        },
        {
          "type": "single",
          "restSec": 90,
          "restText": "90초",
          "exercises": [
            {
              "id": "db_shoulder_press",
              "name": "덤벨 숄더프레스 (앉아서)",
              "category": "accessory",
              "equipment": "dumbbell",
              "sets": 3,
              "reps": {
                "min": 8,
                "max": 10
              },
              "rir": [
                1,
                2
              ],
              "targets": {
                "primary": [
                  "어깨 전면"
                ],
                "secondary": [
                  "삼두"
                ]
              },
              "cue": "바벨보다 깊게 내려 늘어난 자극",
              "start": {
                "kgPerHand": 10
              },
              "increment": {
                "step": "dumbbell"
              }
            }
          ]
        },
        {
          "type": "superset",
          "restSec": 60,
          "restText": "60초",
          "exercises": [
            {
              "id": "db_lateral_raise",
              "name": "덤벨 사이드 레터럴 레이즈",
              "category": "isolation",
              "equipment": "dumbbell",
              "sets": 4,
              "reps": {
                "min": 12,
                "max": 15
              },
              "rir": [
                0,
                1
              ],
              "targets": {
                "primary": [
                  "어깨 측면"
                ],
                "secondary": []
              },
              "cue": "몸보다 살짝 앞으로, 팔꿈치가 먼저. 반동이 생기면 무게를 내린다",
              "start": {
                "kgPerHand": 5
              },
              "increment": {
                "step": "dumbbell"
              }
            },
            {
              "id": "rear_delt_machine",
              "name": "리어델트 머신",
              "category": "isolation",
              "equipment": "machine",
              "sets": 3,
              "reps": {
                "min": 15,
                "max": 20
              },
              "rir": [
                0,
                1
              ],
              "targets": {
                "primary": [
                  "어깨 후면"
                ],
                "secondary": []
              },
              "cue": "견갑 고정, 팔만 뒤로",
              "start": null,
              "increment": {
                "step": "machine"
              }
            }
          ]
        },
        {
          "type": "superset",
          "restSec": 60,
          "restText": "45~60초",
          "exercises": [
            {
              "id": "cable_lateral_raise",
              "name": "케이블 사이드 레터럴 레이즈",
              "category": "isolation",
              "equipment": "cable",
              "sets": 3,
              "reps": {
                "min": 12,
                "max": 15
              },
              "perSide": true,
              "rir": [
                0,
                1
              ],
              "targets": {
                "primary": [
                  "어깨 측면"
                ],
                "secondary": []
              },
              "cue": "맨 아래에서도 장력 유지",
              "start": null,
              "increment": {
                "step": "machine"
              }
            },
            {
              "id": "face_pull",
              "name": "페이스풀 (로프)",
              "category": "isolation",
              "equipment": "cable",
              "sets": 3,
              "reps": {
                "min": 12,
                "max": 15
              },
              "rir": [
                0,
                1
              ],
              "targets": {
                "primary": [
                  "어깨 후면"
                ],
                "secondary": [
                  "등 중앙"
                ]
              },
              "cue": "외회전까지 해서 회전근개도 챙긴다",
              "start": null,
              "increment": {
                "step": "machine"
              }
            }
          ]
        }
      ],
      "notes": [
        "등받이 각도 조절 벤치가 없으면 덤벨 숄더프레스는 숄더프레스 머신으로 바꾼다"
      ]
    },
    {
      "id": "thu",
      "weekday": 4,
      "title": "하체",
      "estMin": 49,
      "warmup": "lower",
      "blocks": [
        {
          "type": "single",
          "restSec": 150,
          "restText": "2분30초",
          "exercises": [
            {
              "id": "back_squat",
              "name": "백스쿼트",
              "category": "main",
              "equipment": "barbell",
              "sets": 4,
              "reps": {
                "min": 5,
                "max": 6
              },
              "rir": [
                2,
                2
              ],
              "targets": {
                "primary": [
                  "대퇴사두",
                  "대둔근"
                ],
                "secondary": []
              },
              "cue": "허벅지가 수평 아래까지 깊게 앉아 둔근까지 쓴다. 랙 안전바를 걸고 한다",
              "start": {
                "kg": 40
              },
              "increment": {
                "kg": 5
              },
              "warmupSets": true
            }
          ]
        },
        {
          "type": "single",
          "restSec": 120,
          "restText": "2분",
          "exercises": [
            {
              "id": "romanian_deadlift",
              "name": "루마니안 데드리프트 (바벨)",
              "category": "accessory",
              "equipment": "barbell",
              "sets": 3,
              "reps": {
                "min": 8,
                "max": 10
              },
              "rir": [
                1,
                2
              ],
              "targets": {
                "primary": [
                  "햄스트링",
                  "대둔근",
                  "척추기립근"
                ],
                "secondary": []
              },
              "cue": "엉덩이를 뒤로 빼는 힙힌지, 등은 중립",
              "start": {
                "kg": 40
              },
              "increment": {
                "kg": 5
              }
            }
          ]
        },
        {
          "type": "single",
          "restSec": 90,
          "restText": "90초",
          "exercises": [
            {
              "id": "leg_press",
              "name": "레그프레스 (발 낮고 좁게)",
              "category": "accessory",
              "equipment": "machine",
              "sets": 3,
              "reps": {
                "min": 10,
                "max": 12
              },
              "rir": [
                1,
                2
              ],
              "targets": {
                "primary": [
                  "대퇴사두"
                ],
                "secondary": []
              },
              "cue": "발이 낮을수록 무릎이 더 굽혀져 사두에 집중",
              "start": null,
              "increment": {
                "step": "machine"
              }
            }
          ]
        },
        {
          "type": "superset",
          "restSec": 60,
          "restText": "60초",
          "exercises": [
            {
              "id": "leg_curl",
              "name": "레그컬",
              "category": "isolation",
              "equipment": "machine",
              "sets": 3,
              "reps": {
                "min": 10,
                "max": 15
              },
              "rir": [
                0,
                1
              ],
              "targets": {
                "primary": [
                  "햄스트링"
                ],
                "secondary": []
              },
              "cue": "앉아서 하는 기구면 햄이 더 늘어나 유리",
              "start": null,
              "increment": {
                "step": "machine"
              }
            },
            {
              "id": "smith_calf_raise",
              "name": "스미스 카프레이즈 (무릎 편 채)",
              "category": "isolation",
              "equipment": "smith",
              "sets": 4,
              "reps": {
                "min": 10,
                "max": 15
              },
              "rir": [
                0,
                1
              ],
              "targets": {
                "primary": [
                  "종아리"
                ],
                "secondary": []
              },
              "cue": "아래로 깊게 늘린다",
              "start": null,
              "increment": {
                "kg": 5
              }
            }
          ]
        }
      ],
      "notes": [
        "체력단련 직후라면 일반 워밍업은 생략하고 바로 스쿼트 워밍업 세트로 들어간다"
      ]
    },
    {
      "id": "fri",
      "weekday": 5,
      "title": "팔 + 복근",
      "estMin": 54,
      "warmup": "upper",
      "blocks": [
        {
          "type": "single",
          "restSec": 90,
          "restText": "90초",
          "exercises": [
            {
              "id": "assisted_chinup",
              "name": "어시스트 친업 (언더그립, 어깨너비)",
              "category": "assisted",
              "equipment": "assisted_machine",
              "sets": 3,
              "reps": {
                "min": 6,
                "max": 8
              },
              "rir": [
                1,
                2
              ],
              "targets": {
                "primary": [
                  "광배근"
                ],
                "secondary": [
                  "이두"
                ]
              },
              "cue": "가슴을 바 쪽으로 끌어올린다. 정자세가 되면 로드맵대로 바꾼다",
              "start": {
                "assistKg": [
                  20,
                  30
                ]
              },
              "increment": {
                "assistKg": -5,
                "when": "3×8 달성"
              }
            }
          ]
        },
        {
          "type": "single",
          "restSec": 120,
          "restText": "2분",
          "exercises": [
            {
              "id": "close_grip_bench",
              "name": "클로즈그립 벤치프레스",
              "category": "main",
              "equipment": "barbell",
              "sets": 3,
              "reps": {
                "min": 6,
                "max": 8
              },
              "rir": [
                2,
                2
              ],
              "targets": {
                "primary": [
                  "삼두"
                ],
                "secondary": [
                  "가슴 중부"
                ]
              },
              "cue": "어깨너비 그립, 팔꿈치를 몸 쪽으로 붙여 내린다",
              "start": {
                "kg": 35
              },
              "increment": {
                "kg": 2.5
              },
              "warmupSets": true
            }
          ]
        },
        {
          "type": "superset",
          "restSec": 60,
          "restText": "60초",
          "exercises": [
            {
              "id": "ez_bar_curl",
              "name": "EZ바 컬",
              "category": "isolation",
              "equipment": "ez_bar",
              "sets": 3,
              "reps": {
                "min": 8,
                "max": 12
              },
              "rir": [
                0,
                1
              ],
              "targets": {
                "primary": [
                  "이두"
                ],
                "secondary": []
              },
              "cue": "반동 없이",
              "start": {
                "kg": 20,
                "includesBar": true
              },
              "increment": {
                "kg": 2.5
              }
            },
            {
              "id": "cable_overhead_extension",
              "name": "케이블 오버헤드 익스텐션 (로프)",
              "category": "isolation",
              "equipment": "cable",
              "sets": 3,
              "reps": {
                "min": 10,
                "max": 15
              },
              "rir": [
                0,
                1
              ],
              "targets": {
                "primary": [
                  "삼두"
                ],
                "secondary": []
              },
              "cue": "머리 위에서 장두를 늘린다",
              "start": null,
              "increment": {
                "step": "machine"
              }
            }
          ]
        },
        {
          "type": "superset",
          "restSec": 60,
          "restText": "60초",
          "exercises": [
            {
              "id": "incline_db_curl",
              "name": "인클라인 덤벨 컬",
              "category": "isolation",
              "equipment": "dumbbell",
              "sets": 3,
              "reps": {
                "min": 10,
                "max": 12
              },
              "rir": [
                0,
                1
              ],
              "targets": {
                "primary": [
                  "이두"
                ],
                "secondary": []
              },
              "cue": "팔이 몸 뒤라 장두가 늘어난다",
              "start": {
                "kgPerHand": 7
              },
              "increment": {
                "step": "dumbbell"
              }
            },
            {
              "id": "cable_pushdown",
              "name": "케이블 푸시다운",
              "category": "isolation",
              "equipment": "cable",
              "sets": 3,
              "reps": {
                "min": 10,
                "max": 15
              },
              "rir": [
                0,
                1
              ],
              "targets": {
                "primary": [
                  "삼두"
                ],
                "secondary": []
              },
              "cue": "팔꿈치를 옆구리에 고정",
              "start": null,
              "increment": {
                "step": "machine"
              }
            }
          ]
        },
        {
          "type": "single",
          "restSec": 60,
          "restText": "60초",
          "exercises": [
            {
              "id": "hammer_curl",
              "name": "해머 컬 (덤벨)",
              "category": "isolation",
              "equipment": "dumbbell",
              "sets": 2,
              "reps": {
                "min": 10,
                "max": 12
              },
              "rir": [
                0,
                1
              ],
              "targets": {
                "primary": [
                  "이두"
                ],
                "secondary": []
              },
              "cue": "중립 그립, 팔 두께(상완근)",
              "start": {
                "kgPerHand": 10
              },
              "increment": {
                "step": "dumbbell"
              }
            }
          ]
        },
        {
          "type": "superset",
          "restSec": 45,
          "restText": "45초",
          "exercises": [
            {
              "id": "cable_crunch",
              "name": "케이블 크런치 (로프, 무릎 꿇고)",
              "category": "isolation",
              "equipment": "cable",
              "sets": 3,
              "reps": {
                "min": 10,
                "max": 15
              },
              "rir": [
                0,
                1
              ],
              "targets": {
                "primary": [
                  "복직근"
                ],
                "secondary": []
              },
              "cue": "골반은 고정하고 갈비뼈를 골반 쪽으로 말아 내린다",
              "start": null,
              "increment": {
                "step": "machine"
              }
            },
            {
              "id": "cable_pallof_press",
              "name": "케이블 팔로프 프레스",
              "category": "isolation",
              "equipment": "cable",
              "sets": 3,
              "reps": {
                "min": 10,
                "max": 10
              },
              "perSide": true,
              "rir": [
                1,
                2
              ],
              "targets": {
                "primary": [
                  "복사근"
                ],
                "secondary": []
              },
              "cue": "같은 케이블에서 손잡이만 바꾼다. 몸통 회전을 버틴다",
              "start": null,
              "increment": {
                "step": "machine"
              }
            }
          ]
        }
      ],
      "notes": [
        "등받이 각도 조절 벤치가 없으면 인클라인 덤벨 컬은 케이블 베이지안 컬(케이블을 몸 뒤에 두고 한 팔씩)로 바꾼다"
      ]
    },
    {
      "id": "sat",
      "weekday": 6,
      "title": "휴식",
      "rest": true
    },
    {
      "id": "sun",
      "weekday": 7,
      "title": "휴식",
      "rest": true,
      "notes": [
        "격주로 정자세 턱걸이 최대 개수 측정 (체력검정 준비 땐 팔굽·윗몸 2분도)"
      ]
    }
  ],
  "pullupRoadmap": {
    "test": "격주 일요일 정자세 턱걸이 최대 개수",
    "stages": [
      {
        "stage": 1,
        "maxReps": {
          "min": 1,
          "max": 2
        },
        "tue": "네거티브 3×3",
        "fri": "어시스트 친업 3×6~8"
      },
      {
        "stage": 2,
        "maxReps": {
          "min": 3,
          "max": 5
        },
        "tue": "클러스터: 1~2개씩 6세트, 휴식 45초",
        "fri": "친업 클러스터: 1~2개씩 5세트"
      },
      {
        "stage": 3,
        "maxReps": {
          "min": 6,
          "max": 9
        },
        "tue": "정자세 4세트, 매 세트 2개 남기고",
        "fri": "정자세 친업 3세트, 매 세트 2개 남기고"
      },
      {
        "stage": 4,
        "maxReps": {
          "min": 10,
          "max": null
        },
        "tue": "덤벨 끼운 가중 턱걸이 4×5",
        "fri": "가중 친업 3×6"
      }
    ]
  },
  "nutrition": {
    "proteinG": [
      120,
      150
    ],
    "weightGainKgPerWeek": [
      0.1,
      0.25
    ],
    "stallRule": "2주 평균 체중이 제자리면 하루 200kcal를 더 먹는다"
  },
  "weeklyDirectSets": {
    "가슴 상부": 6,
    "가슴 중부": 7,
    "가슴 하부": 3,
    "광배근": 12,
    "등 중앙": 6,
    "척추기립근": 6,
    "어깨 전면": 7,
    "어깨 측면": 7,
    "어깨 후면": 6,
    "이두": 8,
    "삼두": 9,
    "복직근": 6,
    "복사근": 3,
    "대둔근": 7,
    "대퇴사두": 7,
    "햄스트링": 6,
    "종아리": 4
  },
  "logEntryExample": {
    "date": "2026-11-09",
    "dayId": "mon",
    "exerciseId": "bench_press",
    "set": 1,
    "kg": 40,
    "reps": 6,
    "rir": 3,
    "memo": ""
  }
};
