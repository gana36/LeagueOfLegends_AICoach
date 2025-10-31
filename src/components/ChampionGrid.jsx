export default function ChampionGrid({ champions }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {champions.map((champion, index) => (
        <div
          key={index}
          className="bg-gray-700/30 rounded-lg p-4 text-center hover:bg-gray-700/50 transition-colors"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl font-bold">
            {champion.charAt(0)}
          </div>
          <p className="font-medium text-sm">{champion}</p>
        </div>
      ))}
    </div>
  )
}
