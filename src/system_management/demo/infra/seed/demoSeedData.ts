type DemoMemberProfile = {
  firstName: string
  lastName: string
  age: number
}

export const DEMO_MEMBER_PROFILES = [
  { firstName: 'Royce', lastName: 'Gracie', age: 5 },
  { firstName: 'Rickson', lastName: 'Gracie', age: 6 },
  { firstName: 'Roger', lastName: 'Gracie', age: 7 },
  { firstName: 'Marcelo', lastName: 'Garcia', age: 8 },
  { firstName: 'Gordon', lastName: 'Ryan', age: 9 },
  { firstName: 'Andre', lastName: 'Galvao', age: 10 },
  { firstName: 'Marcus', lastName: 'Almeida', age: 11 },
  { firstName: 'Romulo', lastName: 'Barral', age: 12 },
  { firstName: 'Rafael', lastName: 'Mendes', age: 13 },
  { firstName: 'Guilherme', lastName: 'Mendes', age: 14 },
  { firstName: 'Rubens', lastName: 'Cobrinha', age: 15 },
  { firstName: 'Rodolfo', lastName: 'Vieira', age: 16 },
  { firstName: 'Bernardo', lastName: 'Faria', age: 17 },
  { firstName: 'Leandro', lastName: 'Lo', age: 18 },
  { firstName: 'Tainan', lastName: 'Dalpra', age: 20 },
  { firstName: 'Mica', lastName: 'Galvao', age: 21 },
  { firstName: 'Demian', lastName: 'Maia', age: 22 },
  { firstName: 'Charles', lastName: 'Oliveira', age: 23 },
  { firstName: 'Anderson', lastName: 'Silva', age: 24 },
  { firstName: 'Jose', lastName: 'Aldo', age: 25 },
  { firstName: 'Amanda', lastName: 'Nunes', age: 26 },
  { firstName: 'Valentina', lastName: 'Shevchenko', age: 27 },
  { firstName: 'Zhang', lastName: 'Weili', age: 28 },
  { firstName: 'Joanna', lastName: 'Jedrzejczyk', age: 29 },
  { firstName: 'Islam', lastName: 'Makhachev', age: 30 },
  { firstName: 'Khabib', lastName: 'Nurmagomedov', age: 32 },
  { firstName: 'Jon', lastName: 'Jones', age: 34 },
  { firstName: 'Georges', lastName: 'St-Pierre', age: 36 },
  { firstName: 'Daniel', lastName: 'Cormier', age: 38 },
  { firstName: 'Kamaru', lastName: 'Usman', age: 40 },
  { firstName: 'Israel', lastName: 'Adesanya', age: 42 },
  { firstName: 'Alexander', lastName: 'Volkanovski', age: 44 },
  { firstName: 'Max', lastName: 'Holloway', age: 46 },
  { firstName: 'Conor', lastName: 'McGregor', age: 48 },
  { firstName: 'Dustin', lastName: 'Poirier', age: 50 },
  { firstName: 'Nate', lastName: 'Diaz', age: 52 },
  { firstName: 'Nick', lastName: 'Diaz', age: 54 },
  { firstName: 'Frankie', lastName: 'Edgar', age: 56 },
  { firstName: 'Ronda', lastName: 'Rousey', age: 58 },
  { firstName: 'Holly', lastName: 'Holm', age: 60 },
  { firstName: 'Cris', lastName: 'Cyborg', age: 61 },
  { firstName: 'Fedor', lastName: 'Emelianenko', age: 62 },
  { firstName: 'Mirko', lastName: 'Filipovic', age: 63 },
  { firstName: 'Fabricio', lastName: 'Werdum', age: 64 },
  { firstName: 'Antonio', lastName: 'Nogueira', age: 65 },
  { firstName: 'Junior', lastName: 'Dos Santos', age: 67 },
  { firstName: 'Cain', lastName: 'Velasquez', age: 69 },
  { firstName: 'Lyoto', lastName: 'Machida', age: 71 },
  { firstName: 'Bj', lastName: 'Penn', age: 73 },
  { firstName: 'Henry', lastName: 'Cejudo', age: 75 },
  // Why: make demo rosters feel closer to the app's Polish audience during onboarding, screenshots, and local demos.
  { firstName: 'Mamed', lastName: 'Khalidov', age: 19 },
  { firstName: 'Mariusz', lastName: 'Pudzianowski', age: 31 },
  { firstName: 'Janek', lastName: 'Błachowicz', age: 33 },
  { firstName: 'Mateusz', lastName: 'Gamrot', age: 35 },
  { firstName: 'Karolina', lastName: 'Kowalkiewicz', age: 37 },
  { firstName: 'Damian', lastName: 'Janikowski', age: 39 },
  { firstName: 'Michał', lastName: 'Materla', age: 41 },
  { firstName: 'Łukasz', lastName: 'Jurkowski', age: 43 },
  { firstName: 'Artur', lastName: 'Szpilka', age: 45 },
  { firstName: 'Tomasz', lastName: 'Adamek', age: 47 }
] as const satisfies readonly DemoMemberProfile[]

export const MONTH_SESSION_TEMPLATE = [
  { day: 1, hours: 8, minutes: 0 },
  { day: 1, hours: 12, minutes: 0 },
  { day: 2, hours: 18, minutes: 0 },
  { day: 4, hours: 18, minutes: 0 },
  { day: 6, hours: 18, minutes: 0 },
  { day: 8, hours: 18, minutes: 0 },
  { day: 10, hours: 18, minutes: 0 },
  { day: 12, hours: 18, minutes: 0 },
  { day: 14, hours: 18, minutes: 0 },
  { day: 17, hours: 18, minutes: 0 },
  { day: 19, hours: 18, minutes: 0 },
  { day: 21, hours: 18, minutes: 0 },
  { day: 24, hours: 18, minutes: 0 },
  { day: 26, hours: 18, minutes: 0 },
  { day: 28, hours: 18, minutes: 0 }
] as const

export const DEMO_UNPAID_ABSENT_MEMBER_COUNT = 5
export const DEMO_PREVIOUS_MONTH_UNPAID_ABSENT_MEMBER_COUNT = 4
export const MAX_UNPAID_ATTENDED_MEMBER_COUNT = 3
export const MAX_PREVIOUS_MONTH_UNPAID_ATTENDED_MEMBER_COUNT = 2
export const MIN_CURRENT_SESSION_SIZE = 6
export const MIN_PREVIOUS_SESSION_SIZE = 8
