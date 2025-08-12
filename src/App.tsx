andalaSettings(prev => ({ ...prev, palette }));
                  }}
                  className="w-full p-2 border rounded-md"
                >
                  {Object.keys(PALETTES).map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Exposure Time</label>
                <select
                  value={gameSettings.exposureTime}
                  onChange={(e) => setGameSettings(prev => ({ 
                    ...prev, 
                    exposureTime: parseInt(e.target.value) 
                  }))}
                  className="w-full p-2 border rounded-md"
                >
                  <option value={60}>60 seconds</option>
                  <option value={30}>30 seconds</option>
                  <option value={15}>15 seconds</option>
                  <option value={10}>10 seconds</option>
                  <option value={8}>8 seconds</option>
                  <option value={5}>5 seconds</option>
                  <option value={3}>3 seconds</option>
                  <option value={2}>2 seconds</option>
                </select>
              </div>

              <button
                onClick={() => setMandalaSettings(prev => ({ 
                  ...prev, 
                  seed: Date.now().toString() 
                }))}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 flex items-center justify-center"
              >
                <RefreshCw size={16} className="mr-2" />
                New Design
              </button>
            </div>
          </div>

          {/* Canvas Area */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-lg">
            <div className="p-6">
              {currentMandala && (
                <div className="flex flex-col items-center">
                  {gameState.phase === 'idle' && (
                    <div className="text-center">
                      <p className="text-gray-600 mb-4">Ready to start memory training?</p>
                      <p className="text-sm text-gray-500 mb-6">
                        Look at the colored image, then use your crayons to color the outline!
                      </p>
                      <button
                        onClick={startGame}
                        className="bg-green-500 text-white py-3 px-6 rounded-md hover:bg-green-600 flex items-center"
                      >
                        <Play size={20} className="mr-2" />
                        Start Memory Game
                      </button>
                    </div>
                  )}

                  {gameState.phase === 'showing' && (
                    <div className="text-center">
                      <div className="mb-4">
                        <div className="text-3xl font-bold text-blue-600 mb-2">
                          {Math.ceil(gameState.timeRemaining)}s
                        </div>
                        <div className="text-lg font-medium text-gray-700 mb-1">
                          Remember this pattern!
                        </div>
                        <div className="text-sm text-gray-600">
                          Round {gameState.round} of {gameSettings.roundCount}
                        </div>
                      </div>
                      <div 
                        dangerouslySetInnerHTML={{ __html: currentMandala.coloredSvg }}
                      />
                    </div>
                  )}

                  {gameState.phase === 'waiting' && (
                    <div className="text-center">
                      <div className="mb-6">
                        <h3 className="text-xl font-semibold mb-3">Time's up!</h3>
                        <p className="text-gray-600 mb-4">
                          Now color the outline with your crayons from memory.
                        </p>
                        <p className="text-sm text-gray-500 mb-6">
                          Click the button below when you want to see the original again.
                        </p>
                      </div>
                      
                      <div className="flex justify-center mb-6">
                        <div 
                          dangerouslySetInnerHTML={{ __html: currentMandala.outlineSvg }}
                        />
                      </div>

                      <div className="space-y-3">
                        <button
                          onClick={() => setGameState(prev => ({ ...prev, phase: 'revealing' }))}
                          className="bg-blue-500 text-white py-2 px-6 rounded-md hover:bg-blue-600 mr-4"
                        >
                          Show Original Image
                        </button>
                        <button
                          onClick={nextRound}
                          className="bg-green-500 text-white py-2 px-6 rounded-md hover:bg-green-600"
                        >
                          Next Round
                        </button>
                      </div>
                    </div>
                  )}

                  {gameState.phase === 'revealing' && (
                    <div className="text-center">
                      <div className="mb-4">
                        <h3 className="text-xl font-semibold mb-3">Here's the original!</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Compare with your colored version
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                          <h4 className="font-medium mb-2">Original (Colored)</h4>
                          <div 
                            dangerouslySetInnerHTML={{ __html: currentMandala.coloredSvg }}
                          />
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Your Outline</h4>
                          <div 
                            dangerouslySetInnerHTML={{ __html: currentMandala.outlineSvg }}
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <button
                          onClick={() => setGameState(prev => ({ ...prev, phase: 'waiting' }))}
                          className="bg-gray-500 text-white py-2 px-6 rounded-md hover:bg-gray-600 mr-4"
                        >
                          Hide Original
                        </button>
                        <button
                          onClick={nextRound}
                          className="bg-green-500 text-white py-2 px-6 rounded-md hover:bg-green-600"
                        >
                          Next Round
                        </button>
                      </div>
                    </div>
                  )}

                  {gameState.phase === 'finished' && (
                    <div className="text-center">
                      <h3 className="text-2xl font-bold mb-4">Game Complete! 🎉</h3>
                      <p className="text-lg text-gray-700 mb-6">
                        Great job training your memory!
                      </p>
                      <div className="text-sm text-gray-600 mb-6">
                        Completed {gameState.round} of {gameSettings.roundCount} rounds
                      </div>
                      <button
                        onClick={() => setGameState(prev => ({ ...prev, phase: 'idle', round: 0 }))}
                        className="bg-blue-500 text-white py-3 px-6 rounded-md hover:bg-blue-600"
                      >
                        Play Again
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
