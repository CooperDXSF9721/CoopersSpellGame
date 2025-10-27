function SpellBuilder() {
  const [spells, setSpells] = React.useState([
    { name: "Firebolt", power: 5, element: "Fire" },
    { name: "Frost Spike", power: 4, element: "Ice" },
    { name: "Shockwave", power: 6, element: "Lightning" },
    { name: "Arcane Burst", power: 7, element: "Arcane" }
  ]);

  const handleChange = (index, field, value) => {
    const newSpells = [...spells];
    newSpells[index][field] = value;
    setSpells(newSpells);
  };

  const handleEnterArena = () => {
    localStorage.setItem("playerSpells", JSON.stringify(spells));
    window.location.href = "index.html";
  };

  return (
    <div className="bg-gray-800 bg-opacity-70 p-8 rounded-2xl shadow-2xl border-2 border-amber-600">
      <h1 className="text-3xl font-bold mb-6 text-center text-amber-300">
        Spell Builder
      </h1>

      {spells.map((spell, i) => (
        <div key={i} className="flex flex-col mb-4 p-3 bg-gray-900 rounded-xl border border-amber-800">
          <label className="text-amber-400 font-semibold">Spell {i + 1}</label>
          <input
            type="text"
            value={spell.name}
            onChange={(e) => handleChange(i, "name", e.target.value)}
            placeholder="Spell Name"
            className="p-2 mt-1 bg-gray-800 border border-amber-700 rounded text-amber-200"
          />
          <select
            value={spell.element}
            onChange={(e) => handleChange(i, "element", e.target.value)}
            className="mt-2 p-2 bg-gray-800 border border-amber-700 rounded text-amber-200"
          >
            <option>Fire</option>
            <option>Ice</option>
            <option>Lightning</option>
            <option>Arcane</option>
            <option>Earth</option>
            <option>Shadow</option>
            <option>Light</option>
          </select>
          <input
            type="number"
            value={spell.power}
            min="1"
            max="10"
            onChange={(e) => handleChange(i, "power", e.target.value)}
            className="mt-2 p-2 bg-gray-800 border border-amber-700 rounded text-amber-200"
          />
        </div>
      ))}

      <button
        onClick={handleEnterArena}
        className="w-full mt-4 py-3 bg-amber-700 hover:bg-amber-600 text-white font-bold rounded-xl transition-all shadow-md"
      >
        ⚔️ Enter Arena ⚔️
      </button>
    </div>
  );
}
