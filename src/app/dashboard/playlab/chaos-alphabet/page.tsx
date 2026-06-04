"use client"

import { useState, useEffect, useRef } from "react"
import { Timer, Trophy, Play, ArrowLeft, RefreshCw, Sparkles, AlertTriangle, User, Bot, Zap, Star, ShieldAlert, Users, Copy, Plus, LogIn, Check, Crown, LogOut, ShoppingBag, BookOpen, Lock } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"

type GameState = "MENU" | "SOLO_CONFIG" | "MULTIPLAYER_SETUP" | "MULTIPLAYER_LOBBY" | "COUNTDOWN" | "PLAYING" | "RESULTS" | "SHOP" | "QUESTS"
type Difficulty = "Beginner" | "Easy" | "Normal" | "Hard" | "Expert" | "Master"
type CategoryPack = "Basic" | "Culture" | "Science" | "Geography" | "Mixed" | "Friend" | "Family" | "Dating" | "Study"
type ChaosModifier = "None" | "Double Points" | "Ban Vowels" | "Time Rush" | "Sudden Death"


// Dynamic dictionaries of words for AI simulation and basic verification
const DICTIONARY: Record<string, Record<string, string[]>> = {
  "country": {
    "a": ["Argentina", "Australia", "Austria", "Algeria", "Angola", "Armenia"],
    "b": ["Brazil", "Belgium", "Bahamas", "Bulgaria", "Bolivia", "Bahrain"],
    "c": ["Canada", "China", "Colombia", "Croatia", "Cuba", "Cyprus"],
    "d": ["Denmark", "Dominica", "Djibouti"],
    "e": ["Egypt", "Ecuador", "Estonia", "Ethiopia", "Eritrea"],
    "f": ["France", "Finland", "Fiji"],
    "g": ["Germany", "Greece", "Georgia", "Ghana", "Guatemala"],
    "h": ["Hungary", "Honduras", "Haiti"],
    "i": ["India", "Italy", "Indonesia", "Iran", "Iraq", "Ireland", "Iceland"],
    "j": ["Japan", "Jordan", "Jamaica"],
    "k": ["Kenya", "Kazakhstan", "Kuwait"],
    "l": ["London", "Lebanon", "Libya", "Latvia", "Lithuania"],
    "m": ["Mexico", "Morocco", "Malaysia", "Madagascar", "Monaco", "Malta"],
    "n": ["Norway", "Nepal", "Nigeria", "Netherlands", "New Zealand"],
    "o": ["Oman"],
    "p": ["Peru", "Portugal", "Poland", "Pakistan", "Philippines", "Panama"],
    "r": ["Russia", "Romania", "Rwanda"],
    "s": ["Spain", "Sweden", "Switzerland", "Singapore", "Saudi Arabia", "Senegal"],
    "t": ["Thailand", "Turkey", "Tunisia", "Tanzania"],
    "u": ["Uganda", "Ukraine", "Uruguay", "United Kingdom", "United States"],
    "v": ["Vietnam", "Venezuela", "Vatican City"],
    "w": ["Wales"]
  },
  "animal": {
    "a": ["Alligator", "Antelope", "Aardvark", "Alpaca", "Anaconda", "Ant", "Ape"],
    "b": ["Bear", "Baboon", "Badger", "Bat", "Buffalo", "Beaver", "Butterfly"],
    "c": ["Cat", "Camel", "Cheetah", "Chimpanzee", "Cobra", "Crab", "Crocodile"],
    "d": ["Dog", "Deer", "Dolphin", "Donkey", "Duck", "Dragonfly"],
    "e": ["Elephant", "Eagle", "Eel", "Echidna", "Elk"],
    "f": ["Fox", "Falcon", "Ferret", "Flamingo", "Frog", "Fly"],
    "g": ["Giraffe", "Gorilla", "Goat", "Gecko", "Gazelle"],
    "h": ["Horse", "Hippopotamus", "Hyena", "Hawk", "Hamster"],
    "i": ["Iguana", "Impala", "Ibis"],
    "j": ["Jaguar", "Jackal", "Jellyfish"],
    "k": ["Koala", "Kangaroo", "Kingfisher"],
    "l": ["Lion", "Leopard", "Llama", "Lizard", "Lobster", "Lemur"],
    "m": ["Monkey", "Moose", "Meerkat", "Mouse", "Mongoose"],
    "n": ["Newt", "Nightingale", "Narwhal"],
    "o": ["Owl", "Ostrich", "Otter", "Octopus", "Orangutan"],
    "p": ["Panda", "Panther", "Penguin", "Pig", "Platypus", "Puma", "Pelican"],
    "r": ["Rabbit", "Rat", "Raven", "Reindeer", "Rhinoceros"],
    "s": ["Snake", "Shark", "Sheep", "Squirrel", "Swan", "Spider", "Seal"],
    "t": ["Tiger", "Turtle", "Toucan", "Tapir", "Tarantula"],
    "u": ["Urchin", "Urial"],
    "v": ["Vulture", "Viper", "Vervet"],
    "w": ["Wolf", "Walrus", "Wombat", "Weasel", "Wasp"]
  },
  "food": {
    "a": ["Apple", "Avocado", "Almond", "Apricot", "Asparagus"],
    "b": ["Banana", "Bread", "Butter", "Broccoli", "Beef", "Bacon", "Berry"],
    "c": ["Cheese", "Cake", "Carrot", "Chicken", "Chocolate", "Cherry", "Coconut"],
    "d": ["Donut", "Date", "Dill", "Duck"],
    "e": ["Egg", "Eggplant", "Elderberry"],
    "f": ["Fig", "Fish", "Flour", "Fries"],
    "g": ["Grape", "Garlic", "Ginger", "Grapefruit", "Guava"],
    "h": ["Honey", "Ham", "Hazelnut", "Hummus"],
    "i": ["Ice Cream", "Iceberg Lettuce"],
    "j": ["Jelly", "Jam", "Jalapeno"],
    "k": ["Kiwi", "Kale", "Ketchup"],
    "l": ["Lemon", "Lime", "Lettuce", "Lobster", "Lasagna"],
    "m": ["Mango", "Milk", "Mushroom", "Melon", "Mutton", "Mustard"],
    "n": ["Noodle", "Nut", "Nutmeg"],
    "o": ["Orange", "Oatmeal", "Olive", "Onion", "Oyster"],
    "p": ["Pear", "Peach", "Plum", "Potato", "Pizza", "Pasta", "Peanut", "Pancake"],
    "r": ["Rice", "Radish", "Raspberry", "Ramen"],
    "s": ["Strawberry", "Salad", "Soup", "Steak", "Sugar", "Salmon", "Sausage"],
    "t": ["Tomato", "Toast", "Tangerine", "Trout", "Tofu", "Taco"],
    "u": ["Udon"],
    "v": ["Vanilla", "Vinegar"],
    "w": ["Watermelon", "Walnut", "Wheat", "Waakye", "Waffle", "Wasabi", "Wonton"]
  },
  "profession": {
    "a": ["Actor", "Architect", "Artist", "Accountant", "Astronaut"],
    "b": ["Baker", "Barber", "Biologist", "Builder", "Broker"],
    "c": ["Chef", "Carpenter", "Chemist", "Coach", "Consultant"],
    "d": ["Doctor", "Dentist", "Designer", "Driver", "Detective"],
    "e": ["Engineer", "Editor", "Electrician", "Economist"],
    "f": ["Farmer", "Firefighter", "Fisherman", "Florist"],
    "g": ["Guard", "Gardener", "Geologist", "Guide"],
    "h": ["Hunter", "Historian", "Host"],
    "i": ["Inventor", "Inspector", "Illustrator"],
    "j": ["Janitor", "Journalist", "Judge"],
    "k": ["Keeper", "Keyworker"],
    "l": ["Lawyer", "Librarian", "Lecturer"],
    "m": ["Mechanic", "Manager", "Musician", "Model", "Miner"],
    "n": ["Nurse", "Novelist", "Nutritionist"],
    "o": ["Officer", "Optician", "Operator"],
    "p": ["Pilot", "Plumber", "Police Officer", "Politician", "Painter"],
    "r": ["Reporter", "Researcher", "Receptionist"],
    "s": ["Scientist", "Singer", "Sailor", "Surgeon", "Soldier"],
    "t": ["Teacher", "Technician", "Therapist", "Tailor", "Translator"],
    "u": ["Umpire", "Urologist"],
    "v": ["Veterinarian", "Valet", "Vocalist"],
    "w": ["Writer", "Web Developer", "Welder"]
  },
  "sports": {
    "a": ["Archery", "Athletics", "Auto Racing"],
    "b": ["Baseball", "Basketball", "Badminton", "Boxing", "Bobsleigh"],
    "c": ["Cricket", "Cycling", "Canoeing", "Curling"],
    "d": ["Diving", "Darts", "Disc Golf"],
    "e": ["Equestrian"],
    "f": ["Football", "Fencing", "Fishing", "Frisbee"],
    "g": ["Golf", "Gymnastics"],
    "h": ["Handball", "Hockey", "High Jump"],
    "j": ["Judo", "Javelin", "Jogging"],
    "k": ["Karate", "Kayaking"],
    "l": ["Lacrosse", "Long Jump"],
    "m": ["Marathon", "Motorcycling"],
    "n": ["Netball"],
    "r": ["Rowing", "Rugby", "Running"],
    "s": ["Sailing", "Swimming", "Skiing", "Snowboarding", "Squash", "Surfing"],
    "t": ["Tennis", "Triathlon", "Taekwondo", "Table Tennis"],
    "v": ["Volleyball"],
    "w": ["Wrestling", "Weightlifting", "Water Polo"]
  },
  "scientist": {
    "a": ["Aristotle", "Ampere", "Avogadro", "Anaximander"],
    "b": ["Bohr", "Boyle", "Bell", "Bacon", "Becquerel"],
    "c": ["Curie", "Copernicus", "Cavendish", "Crick"],
    "d": ["Darwin", "Dalton", "Dirac", "Descartes"],
    "e": ["Einstein", "Edison", "Euclid", "Erastosthenes"],
    "f": ["Franklin", "Faraday", "Fermi", "Fleming", "Feynman"],
    "g": ["Galileo", "Gauss", "Goodall", "Gell-Mann"],
    "h": ["Hawking", "Hubble", "Hooke", "Hertz", "Heisenberg"],
    "i": ["Ingenhousz", "Ivanovsky"],
    "j": ["Joule", "Jenner", "Joliot-Curie"],
    "k": ["Kepler", "Kelvin", "Koch", "Kekule"],
    "l": ["Lovelace", "Lavoisier", "Linnaeus", "Leavitt"],
    "m": ["Mendel", "Maxwell", "Mendeleev", "Meitner", "Marconi"],
    "n": ["Newton", "Nobel", "Nye", "Nirenberg"],
    "o": ["Ohm", "Oppenheimer", "Oersted"],
    "p": ["Pasteur", "Planck", "Pavlov", "Pascal", "Penrose"],
    "r": ["Rutherford", "Raman", "Roentgen", "Redi"],
    "s": ["Sagan", "Salk", "Schrodinger", "Somerville", "Soddy"],
    "t": ["Tesla", "Turing", "Thomson", "Townes"],
    "u": ["Urey"],
    "v": ["Volta", "Vesalius", "Virchow", "Venter"],
    "w": ["Watson", "Wegener", "Wiles", "Woese"]
  },
  "planet": {
    "a": ["Andromeda", "Alpha Centauri", "Aldebaran", "Antares", "Altair"],
    "b": ["Betelgeuse", "Bernard's Star"],
    "c": ["Ceres", "Callisto", "Charon", "Castor"],
    "d": ["Deimos", "Dione"],
    "e": ["Earth", "Europa", "Enceladus", "Eris"],
    "g": ["Ganymede"],
    "h": ["Halley's Comet", "Hyades"],
    "i": ["Io", "Iapetus"],
    "j": ["Jupiter", "Janus"],
    "m": ["Mars", "Mercury", "Moon", "Mimas", "Miranda"],
    "n": ["Neptune", "Nereid"],
    "o": ["Orion", "Oberon"],
    "p": ["Pluto", "Phobos", "Proxima Centauri", "Pollux", "Polaris"],
    "r": ["Rigel", "Rhea"],
    "s": ["Saturn", "Sun", "Sirius", "Spica"],
    "t": ["Titan", "Triton", "Titania"],
    "u": ["Uranus", "Umbriel"],
    "v": ["Venus", "Vega"]
  },
  "language": {
    "a": ["Assembly", "Ada", "Algol", "ActionScript"],
    "b": ["Bash", "Basic", "Brainfuck"],
    "c": ["C", "C++", "C#", "COBOL", "Clojure", "CSS"],
    "d": ["Dart", "Delphi"],
    "e": ["Elixir", "Erlang", "Eiffel"],
    "f": ["Fortran", "F#", "Forth", "Flutter"],
    "g": ["Go", "Groovy"],
    "h": ["Haskell", "HTML", "Haxe"],
    "j": ["Java", "JavaScript", "Julia", "JSON"],
    "k": ["Kotlin"],
    "l": ["Lisp", "Lua", "Logo"],
    "m": ["Matlab", "Markdown"],
    "o": ["Objective-C", "OCaml"],
    "p": ["Python", "PHP", "Perl", "Pascal", "Prolog", "Powershell"],
    "r": ["Rust", "Ruby", "R"],
    "s": ["Swift", "Scala", "SQL", "Scheme", "Scratch"],
    "t": ["TypeScript", "Tcl"],
    "v": ["VBScript", "Verilog"],
    "w": ["WebAssembly"]
  },
  "chemical": {
    "a": ["Aluminum", "Argon", "Arsenic", "Gold", "Silver", "Astatine"],
    "b": ["Boron", "Barium", "Beryllium", "Bismuth", "Bromine"],
    "c": ["Carbon", "Calcium", "Copper", "Chlorine", "Cobalt", "Chromium"],
    "d": ["Dysprosium", "Darmstadtium"],
    "e": ["Einsteinium", "Erbium", "Europium"],
    "f": ["Fluorine", "Iron", "Francium", "Fermium"],
    "g": ["Gallium", "Germanium", "Gold", "Gadolinium"],
    "h": ["Hydrogen", "Helium", "Mercury", "Hafnium", "Holmium"],
    "i": ["Iodine", "Iron", "Indium", "Iridium"],
    "j": ["Joliotium"],
    "k": ["Krypton", "Potassium"],
    "l": ["Lithium", "Lead", "Lutetium", "Lanthanum", "Lawrencium"],
    "m": ["Magnesium", "Manganese", "Mercury", "Molybdenum"],
    "n": ["Nitrogen", "Neon", "Nickel", "Sodium", "Niobium", "Neodymium"],
    "o": ["Oxygen", "Osmium"],
    "p": ["Phosphorus", "Platinum", "Lead", "Potassium", "Polonium"],
    "r": ["Radon", "Radium", "Rhenium", "Rubidium", "Ruthenium"],
    "s": ["Sodium", "Sulfur", "Silicon", "Silver", "Selenium", "Scandium"],
    "t": ["Tin", "Titanium", "Tungsten", "Thorium", "Thallium"],
    "u": ["Uranium"],
    "v": ["Vanadium"],
    "w": ["Tungsten", "Water"]
  },
  "invention": {
    "a": ["Airplane", "Automobile", "Antibiotics", "Alternating Current", "Anesthetic"],
    "b": ["Bicycle", "Bulb", "Barometer", "Battery", "Braille", "Barcode"],
    "c": ["Computer", "Compass", "Camera", "Clock", "Calculator", "Concrete"],
    "d": ["Dynamite", "Diesel Engine", "DNA Sequencing", "Daguerreotype"],
    "e": ["Electricity", "Electric Motor", "Email", "Electromagnet"],
    "f": ["Fiber Optics", "FM Radio", "Fractional Distillation"],
    "g": ["Gunpowder", "GPS", "Galvanometer", "Glass"],
    "h": ["Hovercraft", "Helicopter", "Heart Pacemaker"],
    "i": ["Internet", "Internal Combustion Engine", "Inkjet Printer"],
    "j": ["Jet Engine", "Java"],
    "l": ["Lightbulb", "Laser", "Lightning Rod", "Locomotive"],
    "m": ["Microscope", "Microchip", "Morse Code", "Magnetic Resonance Imaging"],
    "n": ["Neon Lamp", "Nuclear Fission", "Nylon"],
    "o": ["Optical Fiber", "Ophthalmoscope"],
    "p": ["Printing Press", "Paper", "Penicillin", "Photography", "Plastics"],
    "r": ["Radar", "Radio", "Refrigerator", "Robotics"],
    "s": ["Steam Engine", "Submarine", "Seismograph", "Semiconductor", "Spectroscope"],
    "t": ["Telephone", "Telescope", "Telegraph", "Television", "Transistor"],
    "u": ["Ultrasound"],
    "v": ["Vaccine", "Velcro", "Video Games"],
    "w": ["Wheel", "Writing", "World Wide Web", "Windmill"]
  },
  "media": {
    "a": ["Avatar", "Avengers", "Aladdin", "Amadeus", "Alien"],
    "b": ["Batman", "Braveheart", "Breaking Bad", "Black Panther", "Bambi"],
    "c": ["Cinderella", "Casablanca", "Chernobyl", "Cars", "Coco"],
    "d": ["Dune", "Dexter", "Django Unchained", "Dracula", "Dumbo"],
    "e": ["Euphoria", "E.T.", "Evangelion", "Entourage"],
    "f": ["Friends", "Fargo", "Fight Club", "Frozen", "Forrest Gump"],
    "g": ["Gladiator", "Game of Thrones", "Goodfellas", "Ghostbusters"],
    "h": ["Hamlet", "House", "Harry Potter", "Homeland", "Hercules"],
    "i": ["Inception", "Interstellar", "Iron Man", "It"],
    "j": ["Jaws", "Joker", "Jurassic Park", "Jumanji"],
    "k": ["Kill Bill", "King Kong", "Kung Fu Panda"],
    "l": ["Lost", "Loki", "Lion King", "La La Land"],
    "m": ["Mulan", "Matrix", "Mad Men", "Modern Family", "Memento"],
    "n": ["Narcos", "Nemo", "Noah", "New Girl"],
    "o": ["Ozark", "Office", "Incredibles"],
    "p": ["Psycho", "Pulp Fiction", "Prison Break", "Pinocchio"],
    "r": ["Ratatouille", "Rocky", "Rick and Morty", "Rambo"],
    "s": ["Shrek", "Suits", "Succession", "Sherlock", "Star Wars", "Simpsons"],
    "t": ["Titanic", "Toy Story", "The Office", "Thor", "Tarzan"],
    "u": ["Up", "Umbrella Academy", "Unforgiven"],
    "v": ["Vikings", "Vampire Diaries"],
    "w": ["Whiplash", "Westworld", "Wednesday", "Wall-E"]
  },
  "book": {
    "a": ["Animal Farm", "Alice in Wonderland", "Anna Karenina"],
    "b": ["Beloved", "Bleak House", "Brave New World", "Beowulf"],
    "c": ["Catcher in the Rye", "Crime and Punishment", "Catch-22"],
    "d": ["Dracula", "David Copperfield", "Dune", "Don Quixote"],
    "e": ["Emma", "Ender's Game", "East of Eden"],
    "f": ["Frankenstein", "Fahrenheit 451", "Faust"],
    "g": ["Great Gatsby", "Grapes of Wrath", "Gulliver's Travels"],
    "h": ["Hobbit", "Hamlet", "Heart of Darkness", "Homer's Odyssey"],
    "i": ["Iliad", "Invisible Man", "It"],
    "j": ["Jane Eyre", "Jungle Book", "Journey to the Center of the Earth"],
    "k": ["Kidnapped", "Kim"],
    "l": ["Lolita", "Les Miserables", "Little Women", "Lord of the Flies"],
    "m": ["Macbeth", "Moby Dick", "Metamorphosis", "Middlemarch"],
    "n": ["Nineteen Eighty-Four", "Narnia"],
    "o": ["Odyssey", "Othello", "Oliver Twist", "Of Mice and Men"],
    "p": ["Pride and Prejudice", "Peter Pan", "Picture of Dorian Gray"],
    "r": ["Rebecca", "Robinson Crusoe", "Romeo and Juliet"],
    "s": ["Scarlet Letter", "Silmarillion", "Sense and Sensibility"],
    "t": ["Treasure Island", "To Kill a Mockingbird", "The Hobbit", "The Odyssey"],
    "u": ["Ulysses", "Uncle Tom's Cabin"],
    "w": ["War and Peace", "Wuthering Heights", "Walden"]
  },
  "music": {
    "a": ["Alternative", "Acoustic", "Ambient", "Afrobeats"],
    "b": ["Blues", "Baroque", "Bluegrass", "Bossa Nova"],
    "c": ["Classical", "Country", "Choral", "Chamber Music"],
    "d": ["Disco", "Dance", "Dubstep", "Death Metal"],
    "e": ["Electronic", "EDM", "Europop", "Electroswing"],
    "f": ["Folk", "Funk", "Flamenco", "Free Jazz"],
    "g": ["Gospel", "Grunge", "Glam Rock"],
    "h": ["Hip Hop", "House", "Heavy Metal", "Hard Rock"],
    "i": ["Indie", "Industrial", "Instrumental"],
    "j": ["Jazz", "J-Pop", "Jungle"],
    "k": ["K-Pop", "Keyboard Solo"],
    "l": ["Latin", "Lofi", "Lullaby"],
    "m": ["Metal", "Motown", "Musical Theater", "Minimalism"],
    "n": ["New Wave", "Neo Soul"],
    "o": ["Opera", "Orchestral"],
    "p": ["Pop", "Punk", "Psychedelic Rock", "Progressive House"],
    "r": ["Rock", "Rap", "Reggae", "Rhythm and Blues", "R&B"],
    "s": ["Soul", "Samba", "Ska", "Salsa", "Synthpop"],
    "t": ["Techno", "Trance", "Trap"],
    "v": ["Vocal Jazz"],
    "w": ["Waltz", "World Music"]
  },
  "celebrity": {
    "a": ["Adele", "Ariana Grande", "Angelina Jolie", "Al Pacino", "Arnold Schwarzenegger"],
    "b": ["Beyonce", "Brad Pitt", "Billie Eilish", "Bruce Willis", "Ben Affleck"],
    "c": ["Chris Hemsworth", "Cristiano Ronaldo", "Cardi B", "Cameron Diaz"],
    "d": ["Drake", "Dwayne Johnson", "David Beckham", "Daniel Radcliffe"],
    "e": ["Eminem", "Emma Watson", "Elon Musk", "Ed Sheeran", "Elizabeth Taylor"],
    "f": ["Frank Sinatra", "Freddie Mercury", "Florence Pugh"],
    "g": ["Gwen Stefani", "George Clooney", "Gigi Hadid"],
    "h": ["Harrison Ford", "Hugh Jackman", "Harry Styles", "Halle Berry"],
    "i": ["Idris Elba", "Ian McKellen", "Irina Shayk"],
    "j": ["Justin Bieber", "Jennifer Lopez", "Johnny Depp", "Julia Roberts"],
    "k": ["Kanye West", "Keanu Reeves", "Kylie Jenner", "Kim Kardashian"],
    "l": ["Leonardo DiCaprio", "Lady Gaga", "Lionel Messi", "Lupita Nyong'o"],
    "m": ["Michael Jackson", "Meryl Streep", "Marilyn Monroe", "Madonna", "Morgan Freeman"],
    "n": ["Nicki Minaj", "Natalie Portman", "Nicolas Cage", "Neil Patrick Harris"],
    "o": ["Oprah Winfrey", "Orlando Bloom", "Olivia Rodrigo"],
    "p": ["Penelope Cruz", "Paul McCartney", "Paris Hilton"],
    "r": ["Rihanna", "Robert Downey Jr", "Ryan Reynolds", "Ryan Gosling"],
    "s": ["Shakira", "Scarlett Johansson", "Selena Gomez", "Sylvester Stallone"],
    "t": ["Taylor Swift", "Tom Cruise", "Tom Hanks", "Travis Scott"],
    "u": ["Usher", "Uma Thurman"],
    "v": ["Vin Diesel", "Victoria Beckham"],
    "w": ["Will Smith", "Woody Allen", "Whitney Houston", "Zendaya"]
  },
  "city": {
    "a": ["Amsterdam", "Athens", "Austin", "Atlanta", "Auckland", "Accra"],
    "b": ["Berlin", "Beijing", "Boston", "Brussels", "Bangkok", "Budapest"],
    "c": ["Cairo", "Chicago", "Cape Town", "Copenhagen", "Calgary", "Caracas"],
    "d": ["Dublin", "Dallas", "Delhi", "Dakar", "Detroit", "Doha"],
    "e": ["Edinburgh", "Edmonton", "Eindhoven", "Essen"],
    "f": ["Frankfurt", "Florence", "Fukuoka", "Fortaleza"],
    "g": ["Geneva", "Guangzhou", "Glasgow", "Gothenburg"],
    "h": ["Helsinki", "Hong Kong", "Houston", "Havana", "Hamburg"],
    "i": ["Istanbul", "Indianapolis", "Incheon", "Islamabad"],
    "j": ["Johannesburg", "Jakarta", "Jerusalem", "Jeddah"],
    "k": ["Kiev", "Kuala Lumpur", "Karachi", "Krakow", "Kingston"],
    "l": ["London", "Lisbon", "Los Angeles", "Lagos", "Lima", "Lyon"],
    "m": ["Madrid", "Moscow", "Mumbai", "Manila", "Melbourne", "Montreal", "Munich"],
    "n": ["New York", "Nairobi", "Naples", "Nice", "Nassau", "New Delhi"],
    "o": ["Oslo", "Osaka", "Ottawa", "Orlando"],
    "p": ["Paris", "Prague", "Beijing", "Philadelphia", "Porto", "Panama City"],
    "r": ["Rome", "Rio de Janeiro", "Riyadh", "Rotterdam", "Reykjavik"],
    "s": ["Sydney", "Seoul", "Singapore", "Stockholm", "Shanghai", "Seattle"],
    "t": ["Tokyo", "Toronto", "Taipei", "Tunis", "Tbilisi", "Tehran"],
    "u": ["Utrecht", "Ufa"],
    "v": ["Vienna", "Vancouver", "Venice", "Valencia"],
    "w": ["Warsaw", "Washington", "Wellington", "Winnipeg"]
  },
  "river": {
    "a": ["Amazon", "Amur", "Arkansas", "Araxes", "Albert"],
    "b": ["Brahmaputra", "Blue Nile", "Black River"],
    "c": ["Congo", "Colorado", "Columbia", "Chao Phraya"],
    "d": ["Danube", "Darling", "Dnieper", "Don", "Drava"],
    "e": ["Euphrates", "Ebro", "Elbe", "Erie"],
    "f": ["Fraser", "Fly River", "Finke"],
    "g": ["Ganges", "Gila", "Garonne", "Gambia"],
    "h": ["Hudson", "Huang He", "Humber", "Huron"],
    "i": ["Indus", "Irrawaddy", "Irtysh", "Illinois"],
    "j": ["Jordan", "Japura", "Juba"],
    "k": ["Kolyma", "Kasai", "Kama"],
    "l": ["Lena", "Limpopo", "Loire", "Lualaba"],
    "m": ["Mississippi", "Missouri", "Mekong", "Mackenzie", "Murray", "Main"],
    "n": ["Nile", "Niger", "Nelson", "Neva"],
    "o": ["Orinoco", "Ob", "Oder", "Ohio", "Ontario"],
    "p": ["Parana", "Po", "Potomac", "Pecos", "Platte"],
    "r": ["Rhine", "Rhone", "Rio Grande", "Red River"],
    "s": ["Senegal", "Seine", "Snake River", "St. Lawrence", "Syr Darya"],
    "t": ["Thames", "Tiber", "Tigris", "Tagus", "Trent", "Titicaca"],
    "u": ["Ural", "Ucayali"],
    "v": ["Volga", "Vistula", "Volta", "Vaal"],
    "w": ["Wabash", "Weser", "Wisconsin", "White Nile"]
  },
  "mountain": {
    "a": ["Alps", "Andes", "Apennines", "Atlas Mountains", "Appalachian", "Ararat"],
    "b": ["Betelgeuse", "Broad Peak", "Baker"],
    "c": ["Cascades", "Carpathians", "Caucasus", "Chimborazo"],
    "d": ["Denali", "Dhaulagiri", "Drakensberg"],
    "e": ["Everest", "Elbrus", "Erebus", "Etna"],
    "f": ["Fuji", "Fitz Roy", "Foraker"],
    "g": ["Gaurishankar", "Gros Morne"],
    "h": ["Himalayas", "Hood", "Hindu Kush"],
    "i": ["Illimani", "Iztaccihuatl"],
    "j": ["Jungfrau", "Jabal Sawda"],
    "k": ["Kilimanjaro", "K2", "Kanchenjunga", "Kosciuszko", "Kenya"],
    "l": ["Lhotse", "Logan", "Lassen"],
    "m": ["Matterhorn", "Mont Blanc", "McKinley", "Mauna Kea", "Manaslu"],
    "n": ["Nanga Parbat", "Nuptse"],
    "o": ["Olympus", "Orizaba", "Oserse"],
    "p": ["Pyrenees", "Popocatepetl", "Pikes Peak"],
    "r": ["Rockies", "Rainier", "Ruapehu", "Rushmore"],
    "s": ["Sierra Nevada", "Shishapangma", "Saint Elias", "Sinai"],
    "t": ["Tabor", "Table Mountain", "Teide"],
    "u": ["Ural Mountains", "Ubinas"],
    "v": ["Vesuvius", "Vinson Massif"],
    "w": ["Whitney", "Waddington", "Washington"]
  },
  "landmark": {
    "a": ["Alhambra", "Angkor Wat", "Acropolis", "Arc de Triomphe", "Atomium"],
    "b": ["Big Ben", "Brandenburg Gate", "Burj Khalifa", "Buckingham Palace"],
    "c": ["Colosseum", "Christ the Redeemer", "Chichen Itza", "CN Tower"],
    "d": ["Duomo", "Disneyland", "Dome of the Rock"],
    "e": ["Eiffel Tower", "Empire State Building", "Ephesus"],
    "f": ["Forbidden City", "Florence Cathedral", "Fushimi Inari-taisha"],
    "g": ["Golden Gate Bridge", "Great Wall of China", "Grand Canyon", "Giza Pyramids"],
    "h": ["Hagia Sophia", "Hollywood Sign", "Hoover Dam"],
    "i": ["Imperial Palace", "Independence Hall"],
    "j": ["Jerusalem Old City", "Jefferson Memorial"],
    "k": ["Kremlin", "Karnak", "Kiyomizu-dera"],
    "l": ["Louvre", "Leaning Tower of Pisa", "London Eye", "Lincoln Memorial"],
    "m": ["Machu Picchu", "Mount Rushmore", "Matterhorn", "Mont Saint-Michel"],
    "n": ["Notre Dame", "Neuschwanstein Castle", "Niagara Falls"],
    "o": ["Opera House Sydney", "Olmec Heads"],
    "p": ["Pyramids of Giza", "Parthenon", "Petra", "Panama Canal", "Pantheon"],
    "r": ["Red Square", "Rijksmuseum", "Roman Forum"],
    "s": ["Stonehenge", "Statue of Liberty", "Sears Tower", "Sagrada Familia"],
    "t": ["Taj Mahal", "Times Square", "Tower of London", "Tower Bridge"],
    "u": ["Uffizi Gallery", "Uluru"],
    "v": ["Vatican Museums", "Versailles Palace"],
    "w": ["Western Wall", "Westminster Abbey", "White House"]
  }
};

export default function ChaosAlphabetPage() {
  const [gameState, setGameState] = useState<GameState>("MENU")
  const [countdown, setCountdown] = useState(3)
  const [timer, setTimer] = useState(60)

  // Coins & Expansion Unlocks State
  const [userId, setUserId] = useState<string | null>(null)
  const [coins, setCoins] = useState(0)
  const [unlockedPacks, setUnlockedPacks] = useState<string[]>(["Basic"])
  const [unlockedModifiers, setUnlockedModifiers] = useState<string[]>(["None", "Double Points"])
  const [activeQuests, setActiveQuests] = useState<{ id: string; title: string; description: string; reward: number; completed: boolean }[]>([
    { id: "alpha_score_80", title: "Word Master", description: "Score over 80 points in a single round.", reward: 50, completed: false },
    { id: "alpha_perfect", title: "Perfect Round", description: "Get a Perfect Round bonus (+25) in Solo Play.", reward: 75, completed: false },
    { id: "alpha_speed", title: "Speed Demon", description: "Submit all answers in under 15 seconds.", reward: 100, completed: false },
    { id: "alpha_modifier", title: "Chaos Survivor", description: "Complete a full Solo Match using any modifier other than None.", reward: 60, completed: false }
  ])
  const [alertMsg, setAlertMsg] = useState<{ text: string; success: boolean } | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Configuration State
  const [selectedPack, setSelectedPack] = useState<CategoryPack>("Basic")
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>("Normal")
  const [selectedModifier, setSelectedModifier] = useState<ChaosModifier>("None")

  // Mode state
  const [isMultiplayer, setIsMultiplayer] = useState(false)
  const [roomCode, setRoomCode] = useState("")
  const [username, setUsername] = useState("")
  const [roomCodeInput, setRoomCodeInput] = useState("")
  const [copied, setCopied] = useState(false)

  // Round tracking state
  const [currentRound, setCurrentRound] = useState(1)
  const [maxRounds, setMaxRounds] = useState(5)
  const [cumulativeUserScore, setCumulativeUserScore] = useState(0)
  const [cumulativeAiScore, setCumulativeAiScore] = useState(0)
  const [cumulativeMultiplayerScores, setCumulativeMultiplayerScores] = useState<Record<string, number>>({})

  // Online Multiplayer State
  const [players, setPlayers] = useState<{
    presenceId: string
    name: string
    isHost: boolean
    status: string
    answersCount: number
    answers?: Record<string, string>
    submitTime?: number | null
  }[]>([])
  const [isHost, setIsHost] = useState(false)
  const [myPresenceId, setMyPresenceId] = useState("")
  const [submittedAnswers, setSubmittedAnswers] = useState<Record<string, {
    name: string
    answers: Record<string, string>
    submitTime: number | null
  }>>({})
  const [selectedPlayerCompare, setSelectedPlayerCompare] = useState<string | null>(null)

  // Leaderboard statistics
  const [soloLeaderboard, setSoloLeaderboard] = useState<{
    name: string
    score: number
    date: string
    modifier: string
  }[]>([])

  // Match State
  const [letter, setLetter] = useState("A")
  const [categories, setCategories] = useState<string[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [aiAnswers, setAiAnswers] = useState<Record<string, string>>({})
  const [aiProgress, setAiProgress] = useState(0)
  const [submitTime, setSubmitTime] = useState<number | null>(null)
  
  // Results / Scores
  const [scoreDetail, setScoreDetail] = useState<{
    base: number
    speed: number
    rarity: number
    uniqueness: number
    perfect: number
    multiplier: number
    total: number
  }>({ base: 0, speed: 0, rarity: 0, uniqueness: 0, perfect: 0, multiplier: 1, total: 0 })

  const [aiScore, setAiScore] = useState(0)

  const activeIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const channelRef = useRef<any>(null)
  
  const triggerAlert = (text: string, success: boolean = true) => {
    setAlertMsg({ text, success })
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setAlertMsg(null), 3000)
  }

  const awardCoins = (amount: number, customId?: string | null) => {
    if (amount <= 0) return
    const activeId = customId !== undefined ? customId : userId
    const coinKey = activeId ? `playlab_coins_${activeId}` : "playlab_coins_local"
    setCoins(prev => {
      const next = prev + amount
      localStorage.setItem(coinKey, next.toString())
      return next
    })
    triggerAlert(`Earned +${amount} PlayLab Coins!`, true)
  }

  const spendCoins = (amount: number): boolean => {
    const coinKey = userId ? `playlab_coins_${userId}` : "playlab_coins_local"
    let success = false
    setCoins(prev => {
      if (prev >= amount) {
        const next = prev - amount
        localStorage.setItem(coinKey, next.toString())
        success = true
        return next
      }
      return prev
    })
    return success
  }

  const buyPack = (packName: string, cost: number) => {
    if (unlockedPacks.includes(packName)) {
      triggerAlert("Pack already unlocked!", false)
      return
    }
    if (spendCoins(cost)) {
      const newList = [...unlockedPacks, packName]
      setUnlockedPacks(newList)
      const packKey = userId ? `chaos_packs_${userId}` : "chaos_packs_local"
      localStorage.setItem(packKey, JSON.stringify(newList))
      triggerAlert(`Unlocked the ${packName} Pack!`, true)
    } else {
      triggerAlert("Insufficient coins!", false)
    }
  }

  const buyModifier = (modName: string, cost: number) => {
    if (unlockedModifiers.includes(modName)) {
      triggerAlert("Modifier already unlocked!", false)
      return
    }
    if (spendCoins(cost)) {
      const newList = [...unlockedModifiers, modName]
      setUnlockedModifiers(newList)
      const modKey = userId ? `chaos_mods_${userId}` : "chaos_mods_local"
      localStorage.setItem(modKey, JSON.stringify(newList))
      triggerAlert(`Unlocked the ${modName} Modifier!`, true)
    } else {
      triggerAlert("Insufficient coins!", false)
    }
  }

  const checkQuests = (roundScore: number, isPerfect: boolean, submitDur: number, activeMod: string) => {
    const questKey = userId ? `chaos_quests_${userId}` : "chaos_quests_local"
    setActiveQuests(prev => {
      const updated = prev.map(q => {
        if (q.completed) return q
        let done = false
        if (q.id === "alpha_score_80" && roundScore > 80) done = true
        if (q.id === "alpha_perfect" && isPerfect) done = true
        if (q.id === "alpha_speed" && submitDur < 15) done = true
        if (q.id === "alpha_modifier" && activeMod !== "None") done = true

        if (done) {
          setTimeout(() => awardCoins(q.reward), 100)
          triggerAlert(`Quest Completed: ${q.title}! (+${q.reward} Coins)`, true)
          return { ...q, completed: true }
        }
        return q
      })
      localStorage.setItem(questKey, JSON.stringify(updated))
      return updated
    })
  }

  // Load auth username and local leaderboards on mount
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      let currentUserId = null
      if (session?.user) {
        currentUserId = session.user.id
        setUserId(session.user.id)
        if (session.user.user_metadata?.full_name) {
          setUsername(session.user.user_metadata.full_name)
        } else if (session.user.email) {
          setUsername(session.user.email.split("@")[0])
        }
      }

      if (typeof window !== "undefined") {
        const coinKey = currentUserId ? `playlab_coins_${currentUserId}` : "playlab_coins_local"
        const savedCoins = localStorage.getItem(coinKey)
        if (savedCoins) {
          setCoins(parseInt(savedCoins) || 0)
        } else {
          setCoins(100)
          localStorage.setItem(coinKey, "100")
        }

        const packKey = currentUserId ? `chaos_packs_${currentUserId}` : "chaos_packs_local"
        const savedPacks = localStorage.getItem(packKey)
        if (savedPacks) {
          try {
            setUnlockedPacks(JSON.parse(savedPacks))
          } catch(e) {}
        }

        const modKey = currentUserId ? `chaos_mods_${currentUserId}` : "chaos_mods_local"
        const savedMods = localStorage.getItem(modKey)
        if (savedMods) {
          try {
            setUnlockedModifiers(JSON.parse(savedMods))
          } catch(e) {}
        }

        const questKey = currentUserId ? `chaos_quests_${currentUserId}` : "chaos_quests_local"
        const savedQuests = localStorage.getItem(questKey)
        if (savedQuests) {
          try {
            setActiveQuests(JSON.parse(savedQuests))
          } catch(e) {}
        }
      }
    }
    fetchUser()

    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("chaos_alphabet_leaderboard")
      if (saved) {
        try {
          setSoloLeaderboard(JSON.parse(saved))
        } catch (e) {
          console.error(e)
        }
      }
    }

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe()
      }
    }
  }, [])

  useEffect(() => {
    if (!isMultiplayer) {
      if (selectedDifficulty === "Beginner") setMaxRounds(3)
      else if (selectedDifficulty === "Easy") setMaxRounds(4)
      else if (selectedDifficulty === "Normal") setMaxRounds(5)
      else if (selectedDifficulty === "Hard") setMaxRounds(6)
      else if (selectedDifficulty === "Expert") setMaxRounds(7)
      else if (selectedDifficulty === "Master") setMaxRounds(8)
    }
  }, [selectedDifficulty, isMultiplayer])

  const saveSoloScore = (score: number) => {
    const newEntry = {
      name: username || "You",
      score: score,
      date: new Date().toLocaleDateString(),
      modifier: selectedModifier
    }
    const updated = [...soloLeaderboard, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
    setSoloLeaderboard(updated)
    localStorage.setItem("chaos_alphabet_leaderboard", JSON.stringify(updated))
  }

  const joinLobby = (code: string, amHost: boolean) => {
    if (channelRef.current) {
      channelRef.current.unsubscribe()
    }

    const myPresId = Math.random().toString(36).substring(2, 9)
    setMyPresenceId(myPresId)
    setPlayers([])
    setAnswers({})
    setSubmittedAnswers({})
    setSubmitTime(null)

    const channel = supabase.channel(`room:${code}`, {
      config: {
        presence: {
          key: myPresId,
        },
      },
    })

    channelRef.current = channel

    // Presence sync
    channel.on('presence', { event: 'sync' }, () => {
      const presenceState = channel.presenceState()
      const mappedPlayers: any[] = []

      Object.keys(presenceState).forEach(key => {
        const presences = presenceState[key] as any[]
        presences.forEach(pres => {
          mappedPlayers.push({
            presenceId: key,
            name: pres.name || "Anonymous",
            isHost: pres.isHost || false,
            status: pres.status || "lobby",
            answersCount: pres.answersCount || 0,
            answers: pres.answers || {},
            submitTime: pres.submitTime || null,
          })
        })
      })

      setPlayers(mappedPlayers)
    })

    // Sync configuration changes from host
    channel.on('broadcast', { event: 'config-sync' }, ({ payload }) => {
      setSelectedPack(payload.selectedPack)
      setSelectedModifier(payload.selectedModifier)
      setMaxRounds(payload.maxRounds || 5)
    })

    // Start game signal
    channel.on('broadcast', { event: 'start-game' }, ({ payload }) => {
      const targetRound = payload.currentRound || 1

      if (targetRound > 1) {
        const submissionDuration = selectedModifier === "Time Rush" ? 30 - timer : 60 - timer
        const myScore = calculatePlayerScore(answers, submissionDuration).total
        setCumulativeUserScore(prev => prev + myScore)

        setCumulativeMultiplayerScores(prev => {
          const updated = { ...prev }
          players.forEach(p => {
            const isMe = p.presenceId === myPresenceId
            const pAnswers = isMe ? answers : (submittedAnswers[p.presenceId]?.answers || {})
            const pTime = isMe ? submissionDuration : (submittedAnswers[p.presenceId]?.submitTime || null)
            const rScore = calculatePlayerScore(pAnswers, pTime).total
            updated[p.presenceId] = (updated[p.presenceId] || 0) + rScore
          })
          return updated
        })
      } else {
        setCumulativeMultiplayerScores({})
        setCumulativeUserScore(0)
      }

      setLetter(payload.letter)
      setSelectedPack(payload.selectedPack)
      setSelectedModifier(payload.selectedModifier)
      setCategories(PACKS[payload.selectedPack as CategoryPack])
      setAnswers({})
      setSubmittedAnswers({})
      setSubmitTime(null)
      setCurrentRound(targetRound)
      setMaxRounds(payload.maxRounds || 5)

      const roundDuration = payload.selectedModifier === "Time Rush" ? 30 : 60
      setTimer(roundDuration)
      setCountdown(3)
      setGameState("COUNTDOWN")
    })

    // Recieve answers submission
    channel.on('broadcast', { event: 'submit-answers' }, ({ payload }) => {
      setSubmittedAnswers(prev => ({
        ...prev,
        [payload.presenceId]: {
          name: payload.name,
          answers: payload.answers,
          submitTime: payload.submitTime,
        }
      }))
    })

    // Play again signal
    channel.on('broadcast', { event: 'play-again' }, () => {
      setGameState("MULTIPLAYER_LOBBY")
      setAnswers({})
      setSubmittedAnswers({})
      setSubmitTime(null)
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          name: username || "Anonymous",
          isHost: amHost,
          status: "lobby",
          answersCount: 0,
        })
        setGameState("MULTIPLAYER_LOBBY")
      }
    })
  }

  const createRoom = () => {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase()
    setRoomCode(code)
    setIsHost(true)
    joinLobby(code, true)
  }

  const handleJoinRoom = () => {
    const code = roomCodeInput.trim().toUpperCase()
    if (code.length === 4) {
      setRoomCode(code)
      setIsHost(false)
      joinLobby(code, false)
    }
  }

  const broadcastStartGame = (roundNum: number = 1) => {
    if (!isHost || !channelRef.current) return
    const selectedLetter = generateLetter()
    channelRef.current.send({
      type: 'broadcast',
      event: 'start-game',
      payload: {
        letter: selectedLetter,
        selectedPack: selectedPack,
        selectedModifier: selectedModifier,
        currentRound: roundNum,
        maxRounds: maxRounds,
      }
    })
  }

  const handlePackChange = (pack: CategoryPack) => {
    setSelectedPack(pack)
    if (isMultiplayer && isHost && channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'config-sync',
        payload: {
          selectedPack: pack,
          selectedModifier: selectedModifier,
        }
      })
    }
  }

  const handleModifierChange = (mod: ChaosModifier) => {
    setSelectedModifier(mod)
    if (isMultiplayer && isHost && channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'config-sync',
        payload: {
          selectedPack: selectedPack,
          selectedModifier: mod,
        }
      })
    }
  }

  const leaveLobby = () => {
    if (channelRef.current) {
      channelRef.current.unsubscribe()
    }
    setGameState("MENU")
    setIsMultiplayer(false)
    setRoomCode("")
    setPlayers([])
  }

  // Category Packs Definitions
  const PACKS: Record<CategoryPack, string[]> = {
    Basic: ["Country", "Animal", "Food", "Profession", "Sports"],
    Culture: ["Movie / Show", "Book Title", "Music Genre", "Celebrity Name", "TV Series"],
    Science: ["Famous Scientist", "Planet / Star", "Coding Language", "Chemical / Element", "Scientific Invention"],
    Geography: ["Country", "Global City", "River / Lake", "Mountain Range", "World Landmark"],
    Mixed: ["Country", "Animal", "Food", "Famous Scientist", "Movie / Show"],
    Friend: ["Mutual Friend", "Inside Joke Word", "Favorite Activity", "Secret Habit", "Hangout Spot"],
    Family: ["Relative's Name", "Family Tradition", "Home Cooked Dish", "Family Pet Peeve", "Childhood Toy"],
    Dating: ["Dream Date Spot", "Cute Pet Name", "Love Song Title", "Romantic Gift", "Green Flag Trait"],
    Study: ["Academic Subject", "Formula / Theorem", "Library Item", "Smart Person Name", "Exam Excuse"]
  }

  // Generates randomized letters (excluding Q, U, V, X, Y, Z for smoother gameplay lookup)
  const generateLetter = () => {
    const alphabet = "ABCDEFGHIJKLMNOPRSTW"
    return alphabet[Math.floor(Math.random() * alphabet.length)]
  }

  const startMatch = (nextRound: boolean = false) => {
    if (isMultiplayer) {
      const targetRound = nextRound ? currentRound + 1 : 1
      broadcastStartGame(targetRound)
      return
    }

    if (nextRound) {
      setCurrentRound(prev => prev + 1)
    } else {
      setCurrentRound(1)
      setCumulativeUserScore(0)
      setCumulativeAiScore(0)
    }

    const selectedLetter = generateLetter()
    setLetter(selectedLetter)
    setCategories(PACKS[selectedPack])
    setAnswers({})
    setAiAnswers({})
    setAiProgress(0)
    setSubmitTime(null)
    
    // Set match duration according to chaos modifiers
    const roundDuration = selectedModifier === "Time Rush" ? 30 : 60
    setTimer(roundDuration)
    setCountdown(3)
    setGameState("COUNTDOWN")
  }

  const handleNextRoundSolo = () => {
    setCumulativeUserScore(prev => prev + scoreDetail.total)
    setCumulativeAiScore(prev => prev + aiScore)
    startMatch(true)
  }

  // Handle countdown before game starts
  useEffect(() => {
    if (gameState === "COUNTDOWN") {
      if (countdown > 0) {
        const timeout = setTimeout(() => setCountdown(c => c - 1), 1000)
        return () => clearTimeout(timeout)
      } else {
        setGameState("PLAYING")
      }
    }
  }, [gameState, countdown])

  // Handle Game Timer & AI Competitor Sim
  useEffect(() => {
    if (gameState === "PLAYING") {
      // Game Timer decrementer
      const gameInterval = setInterval(() => {
        setTimer(t => {
          if (t <= 1) {
            clearInterval(gameInterval)
            finishMatch()
            return 0
          }
          return t - 1
        })
      }, 1000)

      // AI Opponent simulation timer
      let aiIncrementSpeed = 2 // default Beginner
      if (selectedDifficulty === "Easy") aiIncrementSpeed = 3
      if (selectedDifficulty === "Normal") aiIncrementSpeed = 5
      if (selectedDifficulty === "Hard") aiIncrementSpeed = 8
      if (selectedDifficulty === "Expert") aiIncrementSpeed = 12
      if (selectedDifficulty === "Master") aiIncrementSpeed = 20

      const aiInterval = setInterval(() => {
        setAiProgress(p => {
          if (p >= 100) {
            clearInterval(aiInterval)
            return 100
          }
          return Math.min(100, p + aiIncrementSpeed)
        })
      }, 1000)

      activeIntervalRef.current = gameInterval

      return () => {
        clearInterval(gameInterval)
        clearInterval(aiInterval)
      }
    }
  }, [gameState])

  // Helper to generate simulated answers for the AI bot
  const generateAiAnswers = (currLetter: string, currCategories: string[]) => {
    const response: Record<string, string> = {}
    
    currCategories.forEach(cat => {
      // Find dictionary key mapping
      let dictKey = cat.toLowerCase()
      if (dictKey.includes("country")) dictKey = "country"
      if (dictKey.includes("animal")) dictKey = "animal"
      if (dictKey.includes("food")) dictKey = "food"
      if (dictKey.includes("profession")) dictKey = "profession"
      if (dictKey.includes("sports")) dictKey = "sports"

      const list = DICTIONARY[dictKey]?.[currLetter.toLowerCase()] || []
      
      // Determine bot response quality based on difficulty
      if (list.length > 0) {
        if (selectedDifficulty === "Beginner" && Math.random() < 0.3) {
          // Beginner might leave empty
          response[cat] = ""
        } else if (selectedDifficulty === "Easy" && Math.random() < 0.15) {
          response[cat] = ""
        } else {
          // Pick a random word from the dictionary for this letter
          const randomWord = list[Math.floor(Math.random() * list.length)]
          response[cat] = randomWord
        }
      } else {
        // Fallback empty answer if category is not in static offline dictionary
        response[cat] = ""
      }
    })
    return response
  }

  const isValidAnswer = (cat: string, ans: string, targetLetter: string) => {
    const cleaned = ans.trim().toLowerCase()
    if (!cleaned || !cleaned.startsWith(targetLetter.toLowerCase()) || cleaned.length < 3 || cleaned.endsWith("...")) {
      return false
    }

    const isRelationshipCategory = [
      "mutual friend", "inside joke word", "favorite activity", "secret habit", "hangout spot",
      "relative's name", "family tradition", "home cooked dish", "family pet peeve", "childhood toy",
      "dream date spot", "cute pet name", "love song title", "romantic gift", "green flag trait",
      "academic subject", "formula / theorem", "library item", "smart person name", "exam excuse"
    ].some(term => cat.toLowerCase().includes(term))

    if (isRelationshipCategory) {
      return true
    }

    // Map category title to dictionary key
    let dictKey = cat.toLowerCase()
    if (dictKey.includes("country")) dictKey = "country"
    else if (dictKey.includes("animal")) dictKey = "animal"
    else if (dictKey.includes("food")) dictKey = "food"
    else if (dictKey.includes("profession")) dictKey = "profession"
    else if (dictKey.includes("sports")) dictKey = "sports"

    // If we have a list for this category, validate against it
    const categoryDict = DICTIONARY[dictKey]
    if (categoryDict) {
      const allowedWords = categoryDict[targetLetter.toLowerCase()] || []
      return allowedWords.some(w => w.toLowerCase() === cleaned)
    }

    // Fallback for categories not explicitly in static offline dictionary
    return true
  }

  const isValidAnswerWithModifier = (cat: string, ans: string, targetLetter: string, modifier: ChaosModifier) => {
    const cleaned = ans.trim()
    if (!isValidAnswer(cat, cleaned, targetLetter)) {
      return { valid: false, reason: "Invalid Word" }
    }

    if (modifier === "Ban Vowels") {
      const content = cleaned.slice(1).toLowerCase()
      if (/[aeiou]/.test(content)) {
        return { valid: false, reason: "Contains Vowels" }
      }
    }

    return { valid: true, reason: "" }
  }

  // Helper to calculate score for a specific player's answers and submit time
  function calculatePlayerScore(playerAnswers: Record<string, string>, pSubmitTime: number | null) {
    let base = 0
    let rarity = 0
    let uniqueness = 0
    let correctCount = 0

    const basePointsPerWord = selectedPack === "Study" ? 15 : 10

    categories.forEach(cat => {
      const ans = (playerAnswers[cat] || "").trim()
      const validation = isValidAnswerWithModifier(cat, ans, letter, selectedModifier)
      if (validation.valid) {
        correctCount++
        base += basePointsPerWord

        let wordRarity = Math.min(20, Math.max(0, (ans.length - 4) * 3))
        if (/[zqxjkvw]/.test(ans.toLowerCase())) {
          wordRarity += 5
        }
        rarity += wordRarity
      }
    })

    // Compare uniqueness against all other players' answers in the match
    categories.forEach(cat => {
      const ans = (playerAnswers[cat] || "").trim().toLowerCase()
      if (!ans) return

      const validation = isValidAnswerWithModifier(cat, ans, letter, selectedModifier)
      if (!validation.valid) return

      let isUnique = true
      
      if (!isMultiplayer) {
        // Solo comparison against AI Bot
        const botAns = (aiAnswers[cat] || "").trim().toLowerCase()
        if (botAns === ans) {
          isUnique = false
        }
      } else {
        // Multiplayer comparison
        // Compare to my answers if calculating for someone else
        if (playerAnswers !== answers) {
          if ((answers[cat] || "").trim().toLowerCase() === ans) {
            isUnique = false
          }
        }
        // Compare to other players
        Object.keys(submittedAnswers).forEach(presId => {
          const otherData = submittedAnswers[presId]
          if (otherData.answers !== playerAnswers) {
            if ((otherData.answers[cat] || "").trim().toLowerCase() === ans) {
              isUnique = false
            }
          }
        })
      }

      if (isUnique) {
        uniqueness += (selectedPack === "Friend" ? 20 : 10)
      } else {
        // Perks for matching
        if (selectedPack === "Family") {
          uniqueness += 5 // Family Heritage perk
        } else if (selectedPack === "Dating") {
          uniqueness += 15 // Soulmate Sync perk
        }
      }
    })

    const totalDuration = selectedModifier === "Time Rush" ? 30 : 60
    const speed = pSubmitTime !== null ? Math.round(((totalDuration - pSubmitTime) / totalDuration) * 10) : 0
    const perfect = correctCount === categories.length ? 25 : 0
    const multiplier = selectedModifier === "Double Points" ? 2 : 1
    const rawTotal = base + speed + rarity + uniqueness + perfect
    const total = rawTotal * multiplier

    return {
      base,
      speed,
      rarity,
      uniqueness,
      perfect,
      multiplier,
      total,
      correctCount
    }
  }

  // Calculate scores for user & AI or trigger multiplayer submit
  const finishMatch = () => {
    if (activeIntervalRef.current) clearInterval(activeIntervalRef.current)

    const totalDuration = selectedModifier === "Time Rush" ? 30 : 60
    const submissionDuration = totalDuration - timer
    setSubmitTime(submissionDuration)

    if (!isMultiplayer) {
      const finalAiAnswers = generateAiAnswers(letter, categories)
      setAiAnswers(finalAiAnswers)

      // Calculate User Score
      let base = 0
      let rarity = 0
      let uniqueness = 0
      let correctCount = 0

      categories.forEach(cat => {
        const ans = (answers[cat] || "").trim()
        const aiAns = (finalAiAnswers[cat] || "").trim()

        const validation = isValidAnswerWithModifier(cat, ans, letter, selectedModifier)
        if (validation.valid) {
          correctCount++
          base += 10

          let wordRarity = Math.min(20, Math.max(0, (ans.length - 4) * 3))
          if (/[zqxjkvw]/.test(ans.toLowerCase())) {
            wordRarity += 5
          }
          rarity += wordRarity

          if (ans.toLowerCase() !== aiAns.toLowerCase()) {
            uniqueness += 10
          }
        }
      })

      const speed = Math.round((timer / totalDuration) * 10)
      const perfect = correctCount === categories.length ? 25 : 0
      const multiplier = selectedModifier === "Double Points" ? 2 : 1
      const rawTotal = base + speed + rarity + uniqueness + perfect
      const total = rawTotal * multiplier

      setScoreDetail({
        base,
        speed,
        rarity,
        uniqueness,
        perfect,
        multiplier,
        total
      })

      // Award coins (20% of score)
      const coinsEarned = Math.floor(total / 5)
      awardCoins(coinsEarned)

      // Evaluate active quests
      checkQuests(total, perfect > 0, submissionDuration, selectedModifier)

      // Calculate AI Bot Score
      let aiBase = 0
      categories.forEach(cat => {
        const aiAns = (finalAiAnswers[cat] || "").trim()
        const validation = isValidAnswerWithModifier(cat, aiAns, letter, selectedModifier)
        if (validation.valid) {
          aiBase += 10
          if (selectedDifficulty === "Expert") aiBase += 5
          if (selectedDifficulty === "Master") aiBase += 10
        }
      })
      setAiScore(aiBase)
      if (currentRound === maxRounds) {
        saveSoloScore(cumulativeUserScore + total)
      }
      setGameState("RESULTS")
    } else {
      // Multiplayer submit
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'submit-answers',
          payload: {
            presenceId: myPresenceId,
            name: username || "You",
            answers: answers,
            submitTime: submissionDuration,
          }
        })

        channelRef.current.track({
          name: username || "You",
          isHost: isHost,
          status: "submitted",
          answersCount: Object.keys(answers).filter(k => answers[k]?.trim()).length,
        }).catch(() => {})
      }
      setGameState("RESULTS")
    }
  }

  const handleInputChange = (category: string, value: string) => {
    // If Sudden Death modifier is on, check if the typed key starts matching right letter
    if (selectedModifier === "Sudden Death" && value.length > 0) {
      if (!value.toLowerCase().startsWith(letter.toLowerCase())) {
        finishMatch() // Instant game over on invalid input
        return
      }
    }
    const updatedAnswers = { ...answers, [category]: value }
    setAnswers(updatedAnswers)

    // Update real-time status to others in multiplayer channel
    if (isMultiplayer && channelRef.current) {
      const filledCount = Object.keys(updatedAnswers).filter(k => updatedAnswers[k]?.trim()).length
      channelRef.current.track({
        name: username || "You",
        isHost: isHost,
        status: "typing",
        answersCount: filledCount,
      }).catch(() => {})
    }
  }

  return (
    <div className="max-w-4xl mx-auto min-h-[calc(100vh-120px)] flex flex-col space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        {gameState === "MENU" ? (
          <Link href="/dashboard/playlab" className="text-gray-400 hover:text-white flex items-center transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to PlayLab
          </Link>
        ) : (
          <button 
            onClick={() => {
              if (isMultiplayer) {
                leaveLobby()
              } else {
                setGameState("MENU")
              }
            }} 
            className="text-gray-400 hover:text-white flex items-center transition-colors bg-transparent border-none cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Menu
          </button>
        )}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-xs font-bold text-yellow-400">
            <Zap className="h-3.5 w-3.5 fill-current text-yellow-400" /> {coins} Coins
          </div>
          <div className="font-mono text-primary font-bold tracking-widest uppercase text-xs flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-400" />
            Chaos Alphabet Arena
          </div>
        </div>
      </div>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col items-center justify-center">

        {/* PRIMARY MODE MENU */}
        {gameState === "MENU" && (
          <div className="w-full max-w-2xl space-y-8 animate-in fade-in zoom-in duration-300">
            <div className="text-center space-y-2">
              <span className="px-3 py-1 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-xs uppercase tracking-widest font-black rounded-full">
                HumanOS PlayLab
              </span>
              <h1 className="text-5xl font-black bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent drop-shadow-sm">
                Chaos Alphabet Arena
              </h1>
              <p className="text-sm text-gray-400 max-w-md mx-auto">
                Quick-thinking word challenge. Race against the clock or challenge friends in real time.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              {/* Left panel: Core modes */}
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Solo Play Card */}
                <button
                  onClick={() => {
                    setIsMultiplayer(false)
                    setGameState("SOLO_CONFIG")
                    setSelectedPack("Basic")
                  }}
                  className="group relative overflow-hidden rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 to-orange-500/5 p-6 text-left transition-all hover:scale-[1.02] hover:border-yellow-500/40 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <Bot className="h-8 w-8 text-yellow-400 group-hover:animate-bounce" />
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300">
                        Solo Play
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">▶ Solo Play</h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Train your brain against AI bots. Choose your category pack, difficulty level, and modifiers.
                    </p>
                  </div>
                </button>

                {/* Multiplayer Card */}
                <button
                  onClick={() => {
                    setIsMultiplayer(true)
                    setGameState("MULTIPLAYER_SETUP")
                  }}
                  className="group relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-purple-500/5 p-6 text-left transition-all hover:scale-[1.02] hover:border-primary/40 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <Users className="h-8 w-8 text-primary group-hover:animate-pulse" />
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-primary/20 text-primary-foreground">
                        Online Arena
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">▶ Multiplayer</h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Create room lobbies or join friends in real-time matchups using Supabase-powered sync.
                    </p>
                  </div>
                </button>
              </div>

              {/* Right sidebar column: Secondary stacked options */}
              <div className="flex flex-col gap-3 justify-between">
                {/* Packs Shop */}
                <button
                  onClick={() => setGameState("SHOP")}
                  className="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 hover:border-purple-500/40 rounded-xl transition-all text-left"
                >
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5 text-purple-400" />
                    <div>
                      <h4 className="text-xs font-bold text-white">Packs Shop</h4>
                      <p className="text-[10px] text-purple-300">Unlock categories & mods</p>
                    </div>
                  </div>
                </button>

                {/* Quest Log */}
                <button
                  onClick={() => setGameState("QUESTS")}
                  className="w-full flex items-center justify-between p-3.5 bg-white/5 border border-white/5 hover:border-cyan-500/30 rounded-xl transition-all text-left"
                >
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-cyan-400" />
                    <div>
                      <h4 className="text-xs font-bold text-white">Quest Log</h4>
                      <p className="text-[10px] text-gray-400">Complete challenges for coins</p>
                    </div>
                  </div>
                </button>

                {/* Local Leaderboard stack item */}
                <div className="glass-panel p-4 rounded-xl border border-white/5 space-y-3 flex-1 overflow-hidden flex flex-col justify-between">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-1.5 shrink-0">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Local Leaderboard
                    </h4>
                  </div>
                  {soloLeaderboard.length === 0 ? (
                    <p className="text-[10px] text-gray-500 italic py-2 text-center">No local scores yet.</p>
                  ) : (
                    <div className="space-y-1.5 overflow-y-auto max-h-[85px] pr-0.5 custom-scrollbar flex-1">
                      {soloLeaderboard.map((entry, index) => (
                        <div key={index} className="flex justify-between items-center text-[10px] bg-white/5 p-1.5 rounded-lg border border-white/5">
                          <span className="truncate max-w-[80px] font-medium">{index + 1}. {entry.name}</span>
                          <span className="font-bold text-yellow-400">{entry.score}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tournaments (Locked) */}
                <div className="w-full flex items-center justify-between p-3 bg-white/5 border border-white/5 opacity-55 rounded-xl text-left cursor-not-allowed">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-gray-500" />
                    <div>
                      <h4 className="text-xs font-bold text-gray-400">Tournaments</h4>
                      <p className="text-[9px] text-gray-500">Season 1 coming soon</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
        
        {/* SOLO CONFIG/SETUP SCREEN */}
        {gameState === "SOLO_CONFIG" && (
          <div className="w-full max-w-2xl glass-panel p-8 rounded-3xl border border-white/5 space-y-8 animate-in fade-in zoom-in duration-300">
            <div className="text-center space-y-2">
              <span className="px-3 py-1 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-xs uppercase tracking-widest font-black rounded-full">
                Offline Arena
              </span>
              <h1 className="text-4xl font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                Arena Match Settings
              </h1>
              <p className="text-sm text-gray-400">Configure your parameters to compete against the AI bot.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category Packs */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-300">Category Pack</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["Basic", "Culture", "Science", "Geography", "Mixed"] as CategoryPack[]).map(pack => {
                    const isUnlocked = unlockedPacks.includes(pack)
                    return (
                      <button
                        key={pack}
                        disabled={!isUnlocked}
                        onClick={() => handlePackChange(pack)}
                        className={`p-3 text-xs rounded-xl border text-left transition-all ${
                          !isUnlocked ? 'opacity-40 cursor-not-allowed bg-zinc-900 border-zinc-800' :
                          selectedPack === pack ? 'border-primary bg-primary/10 text-white' : 'border-white/5 bg-white/5 text-gray-400 hover:bg-white/10'
                        }`}
                      >
                        {pack} Pack {!isUnlocked && "🔒"}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Bot Difficulty */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-300">Opponent Bot Difficulty</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["Beginner", "Easy", "Normal", "Hard", "Expert", "Master"] as Difficulty[]).map(diff => (
                    <button
                      key={diff}
                      onClick={() => setSelectedDifficulty(diff)}
                      className={`p-3 text-xs rounded-xl border text-left transition-all ${selectedDifficulty === diff ? 'border-yellow-500 bg-yellow-500/10 text-white' : 'border-white/5 bg-white/5 text-gray-400 hover:bg-white/10'}`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Chaos Modifiers */}
            <div className="space-y-3 border-t border-white/5 pt-6">
              <label className="text-sm font-semibold text-gray-300 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-yellow-500" /> Chaos Modifier
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(["None", "Double Points", "Ban Vowels", "Time Rush", "Sudden Death"] as ChaosModifier[]).map(mod => {
                  const isUnlocked = unlockedModifiers.includes(mod)
                  return (
                    <button
                      key={mod}
                      disabled={!isUnlocked}
                      onClick={() => handleModifierChange(mod)}
                      className={`p-3 text-xs rounded-xl border text-center transition-all ${
                        !isUnlocked ? 'opacity-45 cursor-not-allowed bg-zinc-900 border-zinc-800 font-sans' :
                        selectedModifier === mod ? 'border-red-500 bg-red-500/10 text-white' : 'border-white/5 bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      {mod} {!isUnlocked && "🔒"}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-gray-500">
                {selectedModifier === "Double Points" && "All points earned in this round are multiplied by 2x."}
                {selectedModifier === "Ban Vowels" && "Answers must not contain any vowels (A, E, I, O, U) except the first letter."}
                {selectedModifier === "Time Rush" && "Round duration is cut to 30 seconds."}
                {selectedModifier === "Sudden Death" && "Making an invalid entry or typing a wrong letter ends the match immediately."}
                {selectedModifier === "None" && "Standard rules apply. Play at your own speed."}
              </p>
            </div>

            <Button 
              onClick={() => startMatch(false)} 
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 text-white py-6 text-lg font-bold rounded-xl shadow-lg hover:scale-[1.01] transition-transform"
            >
              Start Game Arena
            </Button>
          </div>
        )}

        {/* MULTIPLAYER SETUP SCREEN */}
        {gameState === "MULTIPLAYER_SETUP" && (
          <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-white/5 space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="text-center space-y-2">
              <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 text-xs uppercase tracking-widest font-black rounded-full">
                Multiplayer Lobby Setup
              </span>
              <h2 className="text-3xl font-black text-white">Join or Host Lobbies</h2>
              <p className="text-xs text-gray-400">Choose a nickname to get synced with friends in real time.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Your Display Name</label>
                <input
                  type="text"
                  placeholder="Enter name..."
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 rounded-xl border border-white/10 outline-none text-white focus:border-primary/50 text-sm"
                />
              </div>

              <div className="border-t border-white/5 pt-4 grid grid-cols-1 gap-3">
                {/* Create Room */}
                <Button 
                  onClick={createRoom} 
                  disabled={!username.trim()}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" /> Host New Match Room
                </Button>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-white/5"></div>
                  <span className="flex-shrink mx-4 text-[10px] text-gray-500 uppercase font-black">OR JOIN WITH CODE</span>
                  <div className="flex-grow border-t border-white/5"></div>
                </div>

                {/* Join Room */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="ABCD"
                    value={roomCodeInput}
                    onChange={e => setRoomCodeInput(e.target.value.toUpperCase())}
                    className="flex-1 min-w-0 px-4 py-3 bg-white/5 rounded-xl border border-white/10 outline-none text-white focus:border-primary/50 text-center font-black tracking-widest text-lg"
                  />
                  <Button 
                    onClick={handleJoinRoom} 
                    disabled={!username.trim() || roomCodeInput.length !== 4}
                    className="bg-zinc-800 hover:bg-zinc-700 text-white px-5 rounded-xl font-bold flex items-center gap-1.5"
                  >
                    <LogIn className="h-4 w-4" /> Join
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MULTIPLAYER LOBBY SCREEN */}
        {gameState === "MULTIPLAYER_LOBBY" && (
          <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch animate-in fade-in zoom-in duration-300">
            {/* Lobby Config (Host controls / guest displays) */}
            <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-white/5 flex flex-col justify-between space-y-6">
              <div className="space-y-6">
                <div>
                  <span className="px-2 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] uppercase tracking-widest font-black rounded-full">
                    Match Lobby
                  </span>
                  <h2 className="text-2xl font-black text-white mt-1">Multiplayer Settings</h2>
                  <p className="text-xs text-gray-400">
                    {isHost ? "You are the host. Set categories and start when ready." : "Waiting for the host to finalize parameters and start."}
                  </p>
                </div>

                {/* Pack selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">Category Pack</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["Basic", "Culture", "Science", "Geography", "Mixed", "Friend", "Family", "Dating", "Study"] as CategoryPack[]).map(pack => (
                      <button
                        key={pack}
                        disabled={!isHost}
                        onClick={() => handlePackChange(pack)}
                        className={`p-2 text-xs rounded-xl border text-center transition-all ${selectedPack === pack ? 'border-primary bg-primary/10 text-white' : 'border-white/5 bg-white/5 text-gray-400 hover:bg-white/10'} ${!isHost ? 'cursor-not-allowed opacity-80' : ''}`}
                      >
                        {pack} Pack
                      </button>
                    ))}
                  </div>
                  {selectedPack === "Friend" && (
                    <p className="text-[10px] text-primary mt-1 animate-pulse">
                      ✨ <b>Friend Mode Perk:</b> Inside Joke Multiplier (+20 pts uniqueness). Personal facts accepted!
                    </p>
                  )}
                  {selectedPack === "Family" && (
                    <p className="text-[10px] text-green-400 mt-1 animate-pulse">
                      ✨ <b>Family Mode Perk:</b> Shared Heritage (+5 pts bond bonus if answers match). Personal facts accepted!
                    </p>
                  )}
                  {selectedPack === "Dating" && (
                    <p className="text-[10px] text-red-400 mt-1 animate-pulse">
                      ✨ <b>Dating Mode Perk:</b> Soulmate Sync (+15 pts sync bonus if answers match). Personal facts accepted!
                    </p>
                  )}
                  {selectedPack === "Study" && (
                    <p className="text-[10px] text-blue-400 mt-1 animate-pulse">
                      ✨ <b>Study Mode Perk:</b> Brainy Bonus (+15 base points per correct answer).
                    </p>
                  )}
                </div>

                {/* Modifier selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">Chaos Modifier</label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {(["None", "Double Points", "Ban Vowels", "Time Rush", "Sudden Death"] as ChaosModifier[]).map(mod => (
                      <button
                        key={mod}
                        disabled={!isHost}
                        onClick={() => handleModifierChange(mod)}
                        className={`p-2 text-[10px] rounded-xl border text-center transition-all ${selectedModifier === mod ? 'border-red-500 bg-red-500/10 text-white' : 'border-white/5 bg-white/5 text-gray-400 hover:bg-white/10'} ${!isHost ? 'cursor-not-allowed opacity-80' : ''}`}
                      >
                        {mod}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {isHost ? (
                <Button 
                  onClick={() => startMatch(false)} 
                  className="w-full bg-gradient-to-r from-primary to-purple-600 text-white py-4 font-bold rounded-xl shadow-lg hover:scale-[1.01] transition-transform mt-6"
                >
                  Start Game Round
                </Button>
              ) : (
                <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5 text-center text-xs font-semibold text-yellow-500 animate-pulse mt-6">
                  Waiting for host to launch the match round...
                </div>
              )}
            </div>

            {/* Lobby Code & Connected Player list */}
            <div className="glass-panel p-6 rounded-3xl border border-white/5 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="text-center p-4 bg-black/40 rounded-2xl border border-white/5">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">ROOM LOBBY CODE</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-3xl font-black text-yellow-400 tracking-wider font-mono">{roomCode}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(roomCode)
                        setCopied(true)
                        setTimeout(() => setCopied(false), 2000)
                      }}
                      className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
                    >
                      {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide border-b border-white/5 pb-2">
                    Joined Players ({players.length})
                  </h3>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                    {players.map(p => (
                      <div key={p.presenceId} className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/5">
                        <div className="flex items-center gap-2 truncate">
                          {p.isHost ? <Crown className="h-3.5 w-3.5 text-yellow-500 shrink-0" /> : <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />}
                          <span className="text-xs font-bold truncate">{p.name} {p.presenceId === myPresenceId && "(You)"}</span>
                        </div>
                        <span className="text-[9px] bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded font-black uppercase">
                          Lobby
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <Button 
                onClick={leaveLobby} 
                variant="ghost" 
                className="w-full text-xs font-semibold hover:bg-red-500/10 text-gray-500 hover:text-red-400 flex items-center justify-center gap-1.5 border border-white/5"
              >
                <LogOut className="h-3.5 w-3.5" /> Leave Lobby
              </Button>
            </div>
          </div>
        )}

        {/* COUNTDOWN SCREEN */}
        {gameState === "COUNTDOWN" && (
          <div className="text-center animate-in zoom-in duration-300 space-y-4">
            <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Get Ready...</p>
            <div className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-400 to-orange-500 drop-shadow-[0_0_35px_rgba(234,179,8,0.4)]">
              {countdown}
            </div>
          </div>
        )}

        {/* PLAYING SCREEN */}
        {gameState === "PLAYING" && (
          <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            
            {/* Input Grid */}
            <div className="lg:col-span-2 space-y-6 flex flex-col justify-between">
              <div className="flex items-center justify-between glass-panel p-6 rounded-2xl border border-white/5 shadow-xl">
                <div className="text-center">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Target Letter</p>
                  <div className="text-6xl font-black text-yellow-400 leading-none">
                    {letter}
                  </div>
                </div>
                
                {selectedModifier !== "None" && (
                  <div className="px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-xs font-bold text-red-400 flex items-center gap-1.5 animate-pulse">
                    <ShieldAlert className="h-4 w-4" /> {selectedModifier}
                  </div>
                )}

                <div className="text-center">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Time Remaining</p>
                  <div className={`text-4xl font-mono font-bold flex items-center ${timer <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                    <Timer className="h-6 w-6 mr-2 opacity-50" />
                    {timer}s
                  </div>
                </div>
              </div>

              <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar flex-1">
                {categories.map((cat, idx) => (
                  <div key={idx} className="bg-white/5 border border-white/5 rounded-xl p-4 focus-within:border-yellow-500/50 transition-all flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                      {cat}
                    </label>
                    <input
                      type="text"
                      value={answers[cat] || ""}
                      onChange={e => handleInputChange(cat, e.target.value)}
                      placeholder={`Type answer starting with ${letter}...`}
                      className="bg-transparent border-none outline-none text-lg text-white placeholder:text-zinc-700"
                      autoFocus={idx === 0}
                    />
                  </div>
                ))}
              </div>

              <Button onClick={finishMatch} className="w-full bg-white/10 hover:bg-white/20 text-white py-5 text-sm font-bold mt-4">
                LOCK IN & SUBMIT
              </Button>
            </div>

            {/* Sidebar Players / Bot Tracker */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-gray-400 uppercase tracking-widest border-b border-white/5 pb-2">
                  Competitors
                </h3>
                
                {/* User Info */}
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                  <div className="p-2 bg-primary/20 text-primary rounded-lg">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{username || "You"}</p>
                    <p className="text-xs text-gray-400">
                      {Object.keys(answers).filter(k => answers[k]?.trim()).length} / {categories.length} answers filled
                    </p>
                  </div>
                </div>

                {!isMultiplayer ? (
                  /* Solo AI Opponent Info */
                  <div className="flex flex-col gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-500/20 text-yellow-500 rounded-lg">
                        <Bot className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">Opponent Bot</p>
                        <p className="text-xs text-gray-500">Difficulty: {selectedDifficulty}</p>
                      </div>
                    </div>

                    <div className="space-y-1 mt-2">
                      <div className="flex justify-between text-xs font-mono text-gray-400">
                        <span>Status</span>
                        <span>{aiProgress}% Done</span>
                      </div>
                      <div className="w-full bg-black/50 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-yellow-500 h-full transition-all duration-500" 
                          style={{ width: `${aiProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Multiplayer Players progress Info */
                  <div className="space-y-2">
                    <p className="text-[10px] text-gray-500 font-bold uppercase">Lobby Opponents</p>
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {players.filter(p => p.presenceId !== myPresenceId).map(p => (
                        <div key={p.presenceId} className="p-2.5 bg-white/5 rounded-xl border border-white/5 flex flex-col gap-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold truncate">{p.name}</span>
                            <span className={`text-[9px] font-black uppercase ${p.status === "submitted" ? 'text-green-400' : 'text-yellow-400 animate-pulse'}`}>
                              {p.status === "submitted" ? 'Submitted' : 'Typing...'}
                            </span>
                          </div>
                          
                          <div className="w-full bg-black/40 rounded-full h-1 overflow-hidden">
                            <div 
                              className="bg-primary h-full transition-all duration-500" 
                              style={{ width: `${(p.answersCount / categories.length) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Tips & Modifier Rules */}
              <div className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-xl">
                <h4 className="text-xs font-bold text-yellow-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-current" /> Scoring Rarity Tip
                </h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Longer, complex words and those containing less common letters (Z, Q, X, J, K) yield much higher Rarity Bonuses!
                </p>
              </div>
            </div>

          </div>
        )}

        {/* RESULTS SCREEN */}
        {gameState === "RESULTS" && (
          <div className="w-full max-w-4xl space-y-8 animate-in slide-in-from-bottom-8 duration-500">
            
            {isMultiplayer && !players.every(p => p.status === "submitted" || p.presenceId === myPresenceId) ? (
              /* Multiplayer Waiting Room inside Results */
              <div className="glass-panel p-8 rounded-3xl border border-white/5 text-center space-y-4 max-w-md mx-auto">
                <RefreshCw className="h-10 w-10 text-yellow-400 animate-spin mx-auto" />
                <h3 className="text-xl font-bold">Waiting for players...</h3>
                <p className="text-xs text-gray-400">Locking in scores. Waiting for everyone to submit or their timers to expire.</p>
                <div className="space-y-2 mt-4 text-left border-t border-white/5 pt-4">
                  {players.map(p => (
                    <div key={p.presenceId} className="flex justify-between items-center text-xs p-2 bg-white/5 rounded-lg border border-white/5">
                      <span className="font-semibold">{p.name} {p.presenceId === myPresenceId && "(You)"}</span>
                      <span className={p.status === "submitted" ? "text-green-400 font-bold" : "text-yellow-400 animate-pulse font-bold"}>
                        {p.status === "submitted" ? "✓ LOCKED IN" : "✏ PLAYING..."}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Scoring breakdowns and details (All submissions finalized) */
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Point Breakdown card */}
                  <div className="glass-panel p-6 rounded-3xl border border-white/5 flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-yellow-400">
                        <Trophy className="h-8 w-8 drop-shadow-[0_0_15px_rgba(250,204,21,0.4)]" />
                        <h2 className="text-2xl font-black">Scorecard</h2>
                      </div>
                      
                      {(() => {
                        const scoreData = isMultiplayer 
                          ? calculatePlayerScore(answers, submitTime)
                          : scoreDetail;

                        return (
                          <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4 text-sm font-medium">
                            <div className="flex justify-between border-b border-white/5 pb-2 col-span-2 text-xs text-yellow-500 font-bold uppercase">
                              <span>Round {currentRound} of {maxRounds}</span>
                              <span>Cumulative: {cumulativeUserScore + scoreData.total} pts</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-2">
                              <span className="text-gray-500">Base Points</span>
                              <span>{scoreData.base}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-2">
                              <span className="text-gray-500">Speed Bonus</span>
                              <span>+{scoreData.speed}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-2">
                              <span className="text-gray-500">Rarity Bonus</span>
                              <span>+{scoreData.rarity}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-2">
                              <span className="text-gray-500">Uniqueness</span>
                              <span>+{scoreData.uniqueness}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-2 col-span-2">
                              <span className="text-gray-500">Perfect Round Bonus</span>
                              <span>+{scoreData.perfect}</span>
                            </div>
                            
                            <div className="col-span-2 border-t border-white/5 pt-4 mt-2 flex items-center justify-between">
                              <div>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Multiplier</p>
                                <p className="text-sm font-semibold">{scoreData.multiplier}x {selectedModifier !== "None" && `(${selectedModifier})`}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Round Score</p>
                                <p className="text-3xl font-black text-yellow-400">{scoreData.total} pts</p>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Competitor / Score Leaderboard comparison card */}
                  <div className="glass-panel p-6 rounded-3xl border border-white/5 flex flex-col justify-between">
                    {!isMultiplayer ? (
                      /* Solo AI Verdict Details */
                      <div className="space-y-4 flex-1 flex flex-col justify-between">
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-primary">
                            <Bot className="h-8 w-8" />
                            <h2 className="text-2xl font-black">AI Opponent</h2>
                          </div>
                          <p className="text-sm text-gray-400 leading-relaxed">
                            The bot played at difficulty level <b>{selectedDifficulty}</b>, scoring <b>{aiScore}</b> base points this round.
                          </p>

                          <div className="grid grid-cols-2 gap-2 text-xs border-t border-white/5 pt-4">
                            <div>
                              <p className="text-gray-500 uppercase font-bold text-[9px]">Round AI Score</p>
                              <p className="font-semibold text-white">{aiScore} pts</p>
                            </div>
                            <div>
                              <p className="text-gray-500 uppercase font-bold text-[9px]">Cumulative AI Score</p>
                              <p className="font-semibold text-white">{cumulativeAiScore + aiScore} pts</p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 flex flex-col items-center justify-center p-4 rounded-2xl border border-white/5 bg-black/20 text-center">
                          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">
                            {currentRound === maxRounds ? "Final Match Verdict" : "Round Status"}
                          </p>
                          {(() => {
                            const userTotal = cumulativeUserScore + scoreDetail.total;
                            const aiTotal = cumulativeAiScore + aiScore;
                            const isFinal = currentRound === maxRounds;
                            const compareUser = isFinal ? userTotal : scoreDetail.total;
                            const compareAi = isFinal ? aiTotal : aiScore;

                            if (compareUser > compareAi) {
                              return <span className="text-green-400 font-black text-2xl tracking-wide">{isFinal ? "VICTORY" : "ROUND WIN"}</span>;
                            } else if (compareUser === compareAi) {
                              return <span className="text-yellow-400 font-black text-2xl tracking-wide">{isFinal ? "DRAW MATCH" : "ROUND DRAW"}</span>;
                            } else {
                              return <span className="text-red-400 font-black text-2xl tracking-wide">{isFinal ? "DEFEAT" : "ROUND LOSS"}</span>;
                            }
                          })()}
                        </div>
                      </div>
                    ) : (
                      /* Multiplayer ranked lobby leaderboard */
                      <div className="space-y-4 flex-1 flex flex-col justify-between">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-primary">
                            <Trophy className="h-8 w-8 text-yellow-500" />
                            <h2 className="text-2xl font-black">Standings</h2>
                          </div>
                          <p className="text-xs text-gray-400">Ranked by cumulative scores across all rounds.</p>
                        </div>

                        <div className="space-y-2 mt-4 max-h-[220px] overflow-y-auto pr-1">
                          {(() => {
                            // Compile scores for all lobby participants
                            const rankings = players.map(p => {
                              const isMe = p.presenceId === myPresenceId;
                              const pAnswers = isMe ? answers : (submittedAnswers[p.presenceId]?.answers || {});
                              const pTime = isMe ? submitTime : (submittedAnswers[p.presenceId]?.submitTime || null);
                              const details = calculatePlayerScore(pAnswers, pTime);
                              const rCumulative = (cumulativeMultiplayerScores[p.presenceId] || 0) + details.total;
                              return {
                                presenceId: p.presenceId,
                                name: p.name,
                                roundScore: details.total,
                                score: rCumulative,
                                correct: details.correctCount,
                                time: pTime,
                                isMe
                              };
                            }).sort((a, b) => b.score - a.score);

                            return rankings.map((rank, index) => (
                              <div key={rank.presenceId} className={`flex items-center justify-between p-3 rounded-xl border ${rank.isMe ? 'bg-primary/10 border-primary/30' : 'bg-white/5 border-white/5'}`}>
                                <div className="flex items-center gap-2.5 truncate">
                                  <span className={`h-6 w-6 rounded-full flex items-center justify-center font-black text-xs ${index === 0 ? 'bg-yellow-500 text-black' : index === 1 ? 'bg-zinc-300 text-black' : 'bg-orange-800 text-white'}`}>
                                    {index + 1}
                                  </span>
                                  <span className="text-xs font-bold truncate">{rank.name} {rank.isMe && "(You)"}</span>
                                </div>
                                <div className="flex items-center gap-3 text-right">
                                  <div className="text-[10px] text-gray-500 font-bold uppercase">
                                    Round: +{rank.roundScore}
                                  </div>
                                  <span className="text-sm font-black text-yellow-400">{rank.score} pts</span>
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Answer comparisons list */}
                <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden">
                  <div className="bg-white/5 px-6 py-4 border-b border-white/5 flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                    <span>Answers Comparison (Letter: {letter})</span>
                    {isMultiplayer ? (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Compare to:</span>
                        <select
                          value={selectedPlayerCompare || ""}
                          onChange={e => setSelectedPlayerCompare(e.target.value || null)}
                          className="bg-black border border-white/10 text-white rounded px-2.5 py-1 text-xs outline-none"
                        >
                          <option value="">AI Bot (Default)</option>
                          {players.filter(p => p.presenceId !== myPresenceId).map(p => (
                            <option key={p.presenceId} value={p.presenceId}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <span>Pack: {selectedPack}</span>
                    )}
                  </div>
                  
                  <div className="divide-y divide-white/5">
                    {categories.map((cat, idx) => {
                      const myAns = (answers[cat] || "").trim()
                      const myVal = isValidAnswerWithModifier(cat, myAns, letter, selectedModifier)

                      let compareName = "Bot";
                      let compareAns = "";
                      let compareVal = { valid: false, reason: "" };

                      if (isMultiplayer && selectedPlayerCompare) {
                        const target = players.find(p => p.presenceId === selectedPlayerCompare);
                        compareName = target ? target.name : "Player";
                        compareAns = (submittedAnswers[selectedPlayerCompare]?.answers?.[cat] || "").trim();
                        compareVal = isValidAnswerWithModifier(cat, compareAns, letter, selectedModifier);
                      } else {
                        compareAns = (aiAnswers[cat] || "").trim();
                        compareVal = isValidAnswerWithModifier(cat, compareAns, letter, selectedModifier);
                      }
                      
                      return (
                        <div key={idx} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* My Answer */}
                          <div className="flex items-start justify-between bg-black/20 p-3 rounded-xl">
                            <div>
                              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">
                                {cat} (You)
                              </p>
                              <p className={`font-semibold text-sm ${!myAns ? 'text-gray-600 italic' : 'text-white'}`}>
                                {myAns || "No answer provided"}
                              </p>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${myVal.valid ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                              {myVal.valid ? "VALID" : myVal.reason ? `INVALID (${myVal.reason})` : "INVALID"}
                            </span>
                          </div>

                          {/* Opponent Answer */}
                          <div className="flex items-start justify-between bg-black/20 p-3 rounded-xl">
                            <div>
                              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">
                                {cat} ({compareName})
                              </p>
                              <p className={`font-semibold text-sm ${!compareAns ? 'text-gray-600 italic' : 'text-yellow-500'}`}>
                                {compareAns || "No answer provided"}
                              </p>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${compareVal.valid ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                              {compareVal.valid ? "VALID" : compareVal.reason ? `INVALID (${compareVal.reason})` : "INVALID"}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Round / Play Again actions */}
                <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                  {currentRound < maxRounds ? (
                    /* Match in progress, show Next Round controls */
                    <>
                      {isMultiplayer ? (
                        <>
                          {isHost ? (
                            <Button 
                              onClick={() => startMatch(true)}
                              className="bg-white hover:bg-zinc-200 text-black font-bold px-8 py-5 rounded-xl shadow-xl hover:scale-105 transition-all w-full sm:w-auto animate-pulse"
                            >
                              Start Round {currentRound + 1} of {maxRounds}
                            </Button>
                          ) : (
                            <div className="text-xs text-yellow-500 font-semibold animate-pulse py-3">
                              Waiting for host to start Round {currentRound + 1}...
                            </div>
                          )}
                          <Button 
                            onClick={leaveLobby}
                            variant="outline" 
                            className="border-red-500/20 hover:bg-red-500/10 text-red-400 font-bold px-6 py-5 rounded-xl transition-all w-full sm:w-auto text-xs"
                          >
                            Abort Match & Leave
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button 
                            onClick={handleNextRoundSolo} 
                            className="bg-white hover:bg-zinc-200 text-black font-bold px-8 py-5 rounded-xl shadow-xl hover:scale-105 transition-all w-full sm:w-auto"
                          >
                            Next Round ({currentRound + 1} of {maxRounds})
                          </Button>
                          <Button 
                            onClick={() => setGameState("MENU")}
                            variant="outline" 
                            className="border-white/10 hover:bg-white/5 text-white font-bold px-6 py-5 rounded-xl transition-all w-full sm:w-auto text-xs"
                          >
                            Abort & Exit
                          </Button>
                        </>
                      )}
                    </>
                  ) : (
                    /* Final Round complete, show Restart controls */
                    <>
                      {isMultiplayer ? (
                        <>
                          {isHost ? (
                            <Button 
                              onClick={() => {
                                if (channelRef.current) {
                                  channelRef.current.send({
                                    type: 'broadcast',
                                    event: 'play-again',
                                    payload: {}
                                  })
                                  setGameState("MULTIPLAYER_LOBBY")
                                  setAnswers({})
                                  setSubmittedAnswers({})
                                  setSubmitTime(null)
                                  setCurrentRound(1)
                                  setCumulativeMultiplayerScores({})
                                  setCumulativeUserScore(0)
                                }
                              }}
                              className="bg-white hover:bg-zinc-200 text-black font-bold px-8 py-5 rounded-xl shadow-xl hover:scale-105 transition-all w-full sm:w-auto"
                            >
                              Return to Lobby
                            </Button>
                          ) : (
                            <div className="text-xs text-gray-400 italic py-3">
                              Waiting for host to return room to Lobby...
                            </div>
                          )}
                          <Button 
                            onClick={leaveLobby}
                            variant="outline" 
                            className="border-white/10 hover:bg-white/5 text-white font-bold px-6 py-5 rounded-xl transition-all w-full sm:w-auto text-xs"
                          >
                            Leave Room
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button 
                            onClick={() => setGameState("SOLO_CONFIG")}
                            variant="outline" 
                            className="border-white/10 hover:bg-white/5 text-white font-bold px-8 py-5 rounded-xl transition-all w-full sm:w-auto"
                          >
                            Match Setup Settings
                          </Button>
                          <Button 
                            onClick={() => startMatch(false)} 
                            className="bg-white hover:bg-zinc-200 text-black font-bold px-8 py-5 rounded-xl shadow-xl hover:scale-105 transition-all w-full sm:w-auto"
                          >
                            <RefreshCw className="h-5 w-5 mr-2" /> Play Again
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}

            {/* SHOP SCREEN */}
            {gameState === "SHOP" && (
              <div className="w-full max-w-4xl space-y-8 animate-in fade-in zoom-in duration-300">
                <div className="text-center space-y-2">
                  <span className="px-3 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs uppercase tracking-widest font-black rounded-full">
                    PlayLab Store
                  </span>
                  <h1 className="text-4xl font-black bg-gradient-to-r from-purple-400 via-indigo-500 to-pink-500 bg-clip-text text-transparent">
                    Packs & Modifiers Shop
                  </h1>
                  <p className="text-sm text-gray-400">Unlock categories and gameplay modifiers using your earned PlayLab Coins.</p>
                </div>

                {/* Category Packs Grid */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/5 pb-2">
                    <ShoppingBag className="h-5 w-5 text-purple-400" /> Category Packs
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { name: "Culture", cost: 150, desc: "Movies, Books, Music, Celebrities, and TV Shows.", icon: "🎬" },
                      { name: "Science", cost: 250, desc: "Famous Scientists, Space, Languages, Elements, and Inventions.", icon: "🔬" },
                      { name: "Geography", cost: 200, desc: "Cities, Rivers, Lakes, Mountain Ranges, and Landmarks.", icon: "🗺️" },
                      { name: "Mixed", cost: 100, desc: "A blend of basic, culture, and science categories.", icon: "🌀" },
                      { name: "Friend", cost: 300, desc: "Social categories: Mutual friends, habits, activities, and spots.", icon: "🤝" },
                      { name: "Family", cost: 300, desc: "Cozy categories: Relatives, traditions, home cooking, and pet peeves.", icon: "🏡" },
                      { name: "Dating", cost: 400, desc: "Romance categories: Dream date spots, cute pet names, and love traits.", icon: "💖" },
                      { name: "Study", cost: 250, desc: "Academic categories: Subjects, theorems, library items, and excuses.", icon: "📚" }
                    ].map(pack => {
                      const isUnlocked = unlockedPacks.includes(pack.name)
                      return (
                        <div key={pack.name} className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col justify-between space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-2xl">{pack.icon}</span>
                              {isUnlocked && (
                                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-green-500/20 text-green-400">Unlocked</span>
                              )}
                            </div>
                            <h4 className="font-bold text-white text-sm">{pack.name} Pack</h4>
                            <p className="text-xs text-gray-400 leading-normal">{pack.desc}</p>
                          </div>
                          <div className="border-t border-white/5 pt-3 flex items-center justify-between">
                            <span className="text-xs font-mono text-yellow-400 flex items-center gap-1">
                              <Zap className="h-3 w-3 fill-current text-yellow-400" /> {pack.cost}
                            </span>
                            {isUnlocked ? (
                              <Button disabled className="bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] py-1 px-3">
                                Owned
                              </Button>
                            ) : (
                              <Button
                                onClick={() => buyPack(pack.name, pack.cost)}
                                className="bg-purple-600 hover:bg-purple-500 text-[10px] py-1 px-3 font-bold"
                              >
                                Buy Pack
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Modifiers Grid */}
                <div className="space-y-4 border-t border-white/5 pt-6">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/5 pb-2">
                    <AlertTriangle className="h-5 w-5 text-red-400" /> Chaotic Modifiers
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { name: "Ban Vowels", cost: 200, desc: "Forces players to type words without vowels (A, E, I, O, U) except the first letter.", icon: "🚫" },
                      { name: "Time Rush", cost: 250, desc: "Cuts the round timer in half to a stressful 30 seconds.", icon: "⏳" },
                      { name: "Sudden Death", cost: 350, desc: "Making any invalid entry or typing a wrong starting letter ends the match immediately.", icon: "💀" }
                    ].map(mod => {
                      const isUnlocked = unlockedModifiers.includes(mod.name)
                      return (
                        <div key={mod.name} className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col justify-between space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-2xl">{mod.icon}</span>
                              {isUnlocked && (
                                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-green-500/20 text-green-400">Unlocked</span>
                              )}
                            </div>
                            <h4 className="font-bold text-white text-sm">{mod.name}</h4>
                            <p className="text-xs text-gray-400 leading-normal">{mod.desc}</p>
                          </div>
                          <div className="border-t border-white/5 pt-3 flex items-center justify-between">
                            <span className="text-xs font-mono text-yellow-400 flex items-center gap-1">
                              <Zap className="h-3 w-3 fill-current text-yellow-400" /> {mod.cost}
                            </span>
                            {isUnlocked ? (
                              <Button disabled className="bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] py-1 px-3">
                                Owned
                              </Button>
                            ) : (
                              <Button
                                onClick={() => buyModifier(mod.name, mod.cost)}
                                className="bg-red-600 hover:bg-red-500 text-[10px] py-1 px-3 font-bold"
                              >
                                Buy Modifier
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* QUESTS LOG SCREEN */}
            {gameState === "QUESTS" && (
              <div className="w-full max-w-2xl glass-panel p-6 rounded-3xl border border-white/5 space-y-6 animate-in fade-in duration-300">
                <div className="border-b border-white/5 pb-3">
                  <h2 className="text-2xl font-black text-white flex items-center gap-2">
                    <Trophy className="h-6 w-6 text-yellow-500" /> Arena Quest Log
                  </h2>
                  <p className="text-xs text-gray-400">Complete these challenges during game rounds to earn extra PlayLab Coins.</p>
                </div>
                <div className="space-y-4">
                  {activeQuests.map(quest => {
                    return (
                      <div key={quest.id} className={`p-4 rounded-xl border flex items-center justify-between ${quest.completed ? 'bg-green-500/5 border-green-500/20' : 'bg-white/5 border-white/5'}`}>
                        <div>
                          <h4 className="font-bold text-white text-sm flex items-center gap-2">
                            {quest.title} {quest.completed && <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">COMPLETE</span>}
                          </h4>
                          <p className="text-xs text-gray-400 mt-1">{quest.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-yellow-400 flex items-center gap-1 justify-end">
                            <Zap className="h-3 w-3 fill-current" /> +{quest.reward} Coins
                          </p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{quest.completed ? "Rewarded" : "Active Challenge"}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

      </div>
    </div>
  )
}
