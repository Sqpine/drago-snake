window.onload = function () {
    var canvas = document.getElementById("viewport");
    var context = canvas.getContext("2d");
    var user_id = document.getElementById("user").innerText;
    var chat_id = document.getElementById("chat").innerText;
    var message_id = document.getElementById("message_id").innerText;
    var inline_message_id = document.getElementById("inline_message_id").innerText;
    // Timing and frames per second
    var lastframe = 0;
    var fpstime = 0;
    var framecount = 0;
    var fps = 0;

    var initialized = false;

    // Images
    var images = [];
    var tileimage;

    // Image loading global variables
    var loadcount = 0;
    var loadtotal = 0;
    var preloaded = false;

    // Load images
    function loadImages(imagefiles) {
        // Initialize variables
        loadcount = 0;
        loadtotal = imagefiles.length;
        preloaded = false;

        // Load the images
        var loadedimages = [];
        for (var i = 0; i < imagefiles.length; i++) {
            // Create the image object
            var image = new Image();

            // Add onload event handler
            image.onload = function () {
                loadcount++;
                if (loadcount == loadtotal) {
                    // Done loading
                    preloaded = true;
                }
            };

            // Set the source url of the image
            image.src = imagefiles[i];

            // Save to the image array
            loadedimages[i] = image;
        }

        // Return an array of images
        return loadedimages;
    }

    // Level properties
    var Level = function (columns, rows, tilewidth, tileheight) {
        this.columns = columns;
        this.rows = rows;
        this.tilewidth = tilewidth;
        this.tileheight = tileheight;

        // Initialize tiles array
        this.tiles = [];
        for (var i = 0; i < this.columns; i++) {
            this.tiles[i] = [];
            for (var j = 0; j < this.rows; j++) {
                this.tiles[i][j] = 0;
            }
        }
    };

    // Generate a default level with walls
    Level.prototype.generate = function () {
        for (var i = 0; i < this.columns; i++) {
            for (var j = 0; j < this.rows; j++) {
                if (i == 0 || i == this.columns - 1 ||
                    j == 0 || j == this.rows - 1) {
                    // Add walls at the edges of the level
                    this.tiles[i][j] = 1;
                } else {
                    // Add empty space
                    this.tiles[i][j] = 0;
                }
            }
        }
    };


    // Snake
    var Snake = function () {
        this.init(0, 0, 1, 10, 1);
    }

    // Direction table: Up, Right, Down, Left
    Snake.prototype.directions = [[0, -1], [1, 0], [0, 1], [-1, 0]];

    // Initialize the snake at a location
    Snake.prototype.init = function (x, y, direction, speed, numsegments) {
        this.x = x;
        this.y = y;
        this.direction = direction; // Up, Right, Down, Left
        this.speed = speed;         // Movement speed in blocks per second
        this.movedelay = 0;

        // Reset the segments and add new ones
        this.segments = [];
        this.growsegments = 0;
        for (var i = 0; i < numsegments; i++) {
            this.segments.push({
                x: this.x - i * this.directions[direction][0],
                y: this.y - i * this.directions[direction][1]
            });
        }
    }

    // Increase the segment count
    Snake.prototype.grow = function () {
        this.growsegments++;
    };

    // Check we are allowed to move
    Snake.prototype.tryMove = function (dt) {
        this.movedelay += dt;
        var maxmovedelay = 1 / this.speed;
        if (this.movedelay > maxmovedelay) {
            return true;
        }
        return false;
    };


    Snake.prototype.nextMove = function () {
        var nextx = this.x + this.directions[this.direction][0];
        var nexty = this.y + this.directions[this.direction][1];
        return {x: nextx, y: nexty};
    }


    Snake.prototype.move = function () {
        // Get the next move and modify the position
        var nextmove = this.nextMove();
        this.x = nextmove.x;
        this.y = nextmove.y;

        // Get the position of the last segment
        var lastseg = this.segments[this.segments.length - 1];
        var growx = lastseg.x;
        var growy = lastseg.y;

        // Move segments to the position of the previous segment
        for (var i = this.segments.length - 1; i >= 1; i--) {
            this.segments[i].x = this.segments[i - 1].x;
            this.segments[i].y = this.segments[i - 1].y;
        }

        // Grow a segment if needed
        if (this.growsegments > 0) {
            this.segments.push({x: growx, y: growy});
            this.growsegments--;
        }

        // Move the first segment
        this.segments[0].x = this.x;
        this.segments[0].y = this.y;

        // Reset movedelay
        this.movedelay = 0;
    }

    // Create objects
    var snake = new Snake();
    var level = new Level(20, 25, 18, 18);

    // Variables
    var score = 0;                      // Score
    var gameover = true;                // Game is over
    var gameovertime = 1;               // How long we have been game over
    var gameoverdelay = 0.5;            // Waiting time after game over
    var intervalCarpet = 0;             // Spawn interval carpet
    var intervalTimeCarpet = 10000;     // Spawn interval carpet
                                        // Direction of Carpet
    var axCarpet = 0;
    var ayCarpet = 0;

    // Initialize the game
    function init() {
        // Load images
        images = loadImages(["snake-graphics1.png", "back.png", "https://cgdragon.devzeus.io/dragon/play.png", "sq.png"]);
        tileimage = images[0];
        playimage = images[2];
        sqimage = images[3];

        document.addEventListener("keydown", onKeyDown);

        // New game
        newGame();
        gameover = true;

        // Enter main loop
        main(0);
    }

    // Check if we can start a new game
    function tryNewGame() {
        if (gameovertime > gameoverdelay) {
            newGame();
            gameover = false;
        }
    }

    function newGame() {
        // Initialize the snake
        snake.init(10, 10, 1, 9, 5);

        // Generate the default level
        level.generate();

        // Add an item
        addItem();
        addItem();
        addItem();

        // Initialize the score
        score = 0;
        document.getElementById("score-value").innerHTML = score;

        // Initialize variables
        gameover = false;
    }

    // Add an item to the level at an empty position
    function addItem() {
        // Loop until we have a valid item
        var valid = false;
        while (!valid) {
            // Get a random position
            var ax = randRange(0, level.columns - 1);
            var ay = randRange(0, level.rows - 1);

            // Make sure the snake doesn't overlap the new item
            var overlap = false;
            for (var i = 0; i < snake.segments.length; i++) {
                // Get the position of the current dragon segment
                var sx = snake.segments[i].x;
                var sy = snake.segments[i].y;

                // Check overlap
                if (ax == sx && ay == sy) {
                    overlap = true;
                    break;
                }
            }

            // Tile must be empty
            if (!overlap && level.tiles[ax][ay] == 0) {
                // Add an item at the tile position
                // Check item type
                d = Math.ceil(Math.random() * 100);
                if ((d >= 1) && (d < 90)) {
                    level.tiles[ax][ay] = 2;
                }
                if ((d >= 90) && (d < 99)) {
                    level.tiles[ax][ay] = 3;
                }

                valid = true;
            }
        }
    }

    // Main loop
    function main(tframe) {
        // Request animation frames
        window.requestAnimationFrame(main);

        if (!initialized) {
            // Preloader

            // Clear the canvas
            context.clearRect(0, 0, canvas.width, canvas.height);

            // Draw a progress bar
            var loadpercentage = loadcount / loadtotal;

            if (preloaded) {
                initialized = true;
            }
        } else {
            // Update and render the game
            update(tframe);
            render();
        }
    }

    // Update the game state
    function update(tframe) {
        var dt = (tframe - lastframe) / 1000;
        lastframe = tframe;

        // Update the fps counter
        updateFps(dt);

        if (!gameover) {
            updateGame(dt);
        } else {
            gameovertime += dt;
        }
    }

    async function updateGame(dt) {
        // Move the snake
        if (snake.tryMove(dt)) {
            // Check snake collisions

            // Get the coordinates of the next move
            var nextmove = snake.nextMove();
            var nx = nextmove.x;
            var ny = nextmove.y;

            if (nx >= 0 && nx < level.columns && ny >= 0 && ny < level.rows) {
                if (level.tiles[nx][ny] === 1 || level.tiles[nx][ny] === 4) {
                    // Collision with a wall
                    gameover = true;
                    $.ajax({
                        url: "/site/score",
                        method: "POST",
                        data: {
                            "user_id": user_id,
                            "chat_id": chat_id,
                            "score": score,
                            "message_id": message_id,
                            "inline_message_id": inline_message_id
                        },
                        success: function (data) {
                        },
                        error: function (data) {
                        },
                    });

                    $.ajax({
                        url: "/site/leaders",
                        method: "POST",
                        data: {"user_id": user_id, "chat_id": chat_id, "score": score, "message_id": message_id},
                        success: function (data) {
                            $("#leaders").html(data);
                        }
                    });

                    if (intervalCarpet) {
                        clearTimeout(intervalCarpet);
                        intervalCarpet = 0;
                    }
                }

                // Collisions with the snake itself
                for (var i = 0; i < snake.segments.length; i++) {
                    var sx = snake.segments[i].x;
                    var sy = snake.segments[i].y;

                    if (nx == sx && ny == sy) {
                        // Found a snake part
                        gameover = true;
                        $.ajax({
                            url: "/site/score",
                            method: "POST",
                            data: {
                                "user_id": user_id,
                                "chat_id": chat_id,
                                "score": score,
                                "message_id": message_id,
                                "inline_message_id": inline_message_id
                            },
                            success: function (data) {
                                //console.log(data);
                            }
                        });
                        break;
                    }
                }

                if (!gameover) {
                    // The snake is allowed to move

                    // Move the snake
                    snake.move();

                    // Check collision with an apple
                    if ((level.tiles[nx][ny] === 2) || (level.tiles[nx][ny] === 3)) {
                        // Spawn interval carpet
                        // Add a point to the score
                        if (level.tiles[nx][ny] === 2) {

                            score = score + 1;
                        } else if (level.tiles[nx][ny] === 3) {

                            score = score + 5;
                        }
                        console.log('interval carpet:', intervalCarpet);
                        if (!intervalCarpet) {
                            spawnCarpet()

                            intervalCarpet = setTimeout(() => {
                                if (level.tiles[axCarpet][ayCarpet] === 4) {
                                    level.tiles[axCarpet][ayCarpet] = 0;
                                }
                                intervalCarpet = 0
                            }, intervalTimeCarpet)
                        }

                        document.getElementById("score-value").innerHTML = score;
                        // Remove the item
                        //audio.play();
                        $('#audio').trigger('play');
                        level.tiles[nx][ny] = 0;

                        // Add a new item
                        addItem();

                        // Grow the snake
                        snake.grow();

                    }


                }
            } else {
                // Out of bounds
                gameover = true;
            }

            if (gameover) {
                gameovertime = 0;
            }
        }
    }

    function updateFps(dt) {
        if (fpstime > 0.25) {
            // Calculate fps
            fps = Math.round(framecount / fpstime);

            // Reset time and framecount
            fpstime = 0;
            framecount = 0;
        }

        // Increase time and framecount
        fpstime += dt;
        framecount++;
    }

    // Spawn carpet
    function spawnCarpet() {
        // Loop until we have a valid item
        var valid = false;

        while (!valid) {
            // Get a random position
            var ax = randRange(0, level.columns - 1);
            var ay = randRange(0, level.rows - 1);

            // Make sure the snake doesn't overlap the new item
            var overlap = false;
            for (var i = 0; i < snake.segments.length; i++) {
                // Get the position of the current dragon segment
                var sx = snake.segments[i].x;
                var sy = snake.segments[i].y;

                // Check overlap
                if (ax === sx && ay === sy) {
                    overlap = true;
                    break;
                }
            }

            // Tile must be empty
            if (!overlap && level.tiles[ax][ay] === 0) {
                // Add an item at the tile position
                // Check item type
                level.tiles[ax][ay] = 4;
                axCarpet = ax;
                ayCarpet = ay;
                valid = true;
            }
        }

    }

    // Render the game
    function render() {
        // Draw background
        context.fillStyle = '#72ac46';
        context.fillRect(0, 0, canvas.width, canvas.height);


        drawLevel();
        drawSnake();

        // Game over
        if (gameover) {
            context.fillStyle = "rgba(0, 0, 0, 0.5)";
            context.fillRect(0, 0, canvas.width, canvas.height);
            $('#canvas-block').css("display", "none");
            $('#start-block').css("display", "block");

            $.ajax({
                url: "/site/leaders",
                method: "POST",
                data: {"user_id": user_id, "chat_id": chat_id, "score": score, "message_id": message_id},
                success: function (data) {
                    $("#leaders").html(data);
                }
            });


        }
    }

    // Draw the level tiles
    function drawLevel() {
        //Square
        let sq = new Image();
        sq.src = "sq.png";

        for (var i = 0; i < level.columns; i++) {
            for (var j = 0; j < level.rows; j++) {
                // Get the current tile and location
                var tile = level.tiles[i][j];
                var tilex = i * level.tilewidth;
                var tiley = j * level.tileheight;

                // Draw tiles based on their type
                if (tile == 0) {
                    // Empty space
                    context.fillRect(tilex, tiley, level.tilewidth, level.tileheight);

                    var tilew = 64;
                    var tileh = 64;

                    context.drawImage(sqimage, 0, 0, tilew, tileh, tilex, tiley, level.tilewidth, level.tileheight);
                } else if (tile == 1) {
                    // Wall

                    context.fillStyle = "#005f62";
                    context.fillRect(tilex, tiley, level.tilewidth, level.tileheight);
                } else if (tile == 2) {
                    // Ethereum

                    // Draw apple background
                    // context.fillStyle = context.createPattern(sq,'no-repeat');
                    context.fillRect(tilex, tiley, level.tilewidth, level.tileheight);

                    // Draw the ethereum image
                    var tx = 0;
                    var ty = 3;
                    var tilew = 64;
                    var tileh = 64;
                    context.drawImage(sqimage, 0, 0, tilew, tileh, tilex, tiley, level.tilewidth, level.tileheight);
                    context.drawImage(tileimage, tx * tilew, ty * tileh, tilew, tileh, tilex, tiley, level.tilewidth, level.tileheight);
                } else if (tile == 3) {
                    // Bitcoin
                    // context.fillStyle = context.createPattern(sq,'no-repeat'); //colors[i];

                    context.fillRect(tilex, tiley, level.tilewidth, level.tileheight);

                    // Draw the bitcoin image
                    var tx = 1;
                    var ty = 3;
                    var tilew = 64;
                    var tileh = 64;
                    context.drawImage(sqimage, 0, 0, tilew, tileh, tilex, tiley, level.tilewidth, level.tileheight);
                    context.drawImage(tileimage, tx * tilew, ty * tileh, tilew, tileh, tilex, tiley, level.tilewidth, level.tileheight);
                } else if (tile == 4) {
                    // Carpet

                    context.fillRect(tilex, tiley, level.tilewidth, level.tileheight);
                    // Draw the carpet image
                    var tx = 2;
                    var ty = 3;
                    var tilew = 64;
                    var tileh = 64;
                    context.drawImage(sqimage, 0, 0, tilew, tileh, tilex, tiley, level.tilewidth, level.tileheight);
                    context.drawImage(tileimage, tx * tilew, ty * tileh, tilew, tileh, tilex, tiley, level.tilewidth, level.tileheight);
                }
            }
        }
    }

    // Draw the snake
    function drawSnake() {
        // Loop over every snake segment
        for (var i = 0; i < snake.segments.length; i++) {
            var segment = snake.segments[i];
            var segx = segment.x;
            var segy = segment.y;
            var tilex = segx * level.tilewidth;
            var tiley = segy * level.tileheight;

            // Sprite column and row that gets calculated
            var tx = 0;
            var ty = 0;

            if (i == 0) {
                // Head; Determine the correct image
                var nseg = snake.segments[i + 1]; // Next segment
                if (segy < nseg.y) {
                    // Up
                    tx = 3;
                    ty = 0;
                } else if (segx > nseg.x) {
                    // Right
                    tx = 4;
                    ty = 0;
                } else if (segy > nseg.y) {
                    // Down
                    tx = 4;
                    ty = 1;
                } else if (segx < nseg.x) {
                    // Left
                    tx = 3;
                    ty = 1;
                }
            } else if (i == snake.segments.length - 1) {
                // Tail; Determine the correct image
                var pseg = snake.segments[i - 1]; // Prev segment
                if (pseg.y < segy) {
                    // Up
                    tx = 3;
                    ty = 2;
                } else if (pseg.x > segx) {
                    // Right
                    tx = 4;
                    ty = 2;
                } else if (pseg.y > segy) {
                    // Down
                    tx = 4;
                    ty = 3;
                } else if (pseg.x < segx) {
                    // Left
                    tx = 3;
                    ty = 3;
                }
            } else {
                // Body; Determine the correct image
                var pseg = snake.segments[i - 1]; // Previous segment
                var nseg = snake.segments[i + 1]; // Next segment
                if (pseg.x < segx && nseg.x > segx || nseg.x < segx && pseg.x > segx) {
                    // Horizontal Left-Right
                    tx = 1;
                    ty = 0;
                } else if (pseg.x < segx && nseg.y > segy || nseg.x < segx && pseg.y > segy) {
                    // Angle Left-Down
                    tx = 2;
                    ty = 0;
                } else if (pseg.y < segy && nseg.y > segy || nseg.y < segy && pseg.y > segy) {
                    // Vertical Up-Down
                    tx = 2;
                    ty = 1;
                } else if (pseg.y < segy && nseg.x < segx || nseg.y < segy && pseg.x < segx) {
                    // Angle Top-Left
                    tx = 2;
                    ty = 2;
                } else if (pseg.x > segx && nseg.y < segy || nseg.x > segx && pseg.y < segy) {
                    // Angle Right-Up
                    tx = 0;
                    ty = 1;
                } else if (pseg.y > segy && nseg.x > segx || nseg.y > segy && pseg.x > segx) {
                    // Angle Down-Right
                    tx = 0;
                    ty = 0;
                }
            }

            // Draw the image of the snake part
            context.drawImage(tileimage, tx * 64, ty * 64, 64, 64, tilex, tiley,
                level.tilewidth, level.tileheight);
        }
    }

    // Draw text that is centered
    function drawCenterText(text, x, y, width) {
        var textdim = context.measureText(text);
        context.fillText(text, x + (width - textdim.width) / 2, y);
    }

    // Get a random int between low and high, inclusive
    function randRange(low, high) {
        return Math.floor(low + Math.random() * (high - low + 1));
    }


    // Keyboard event handler
    function onKeyDown(e) {
        if (e.keyCode == 37 || e.keyCode == 65) {
            // Left or A
            if (snake.direction != 1) {
                snake.direction = 3;
            }
        } else if (e.keyCode == 38 || e.keyCode == 87) {
            // Up or W
            if (snake.direction != 2) {
                snake.direction = 0;
            }
        } else if (e.keyCode == 39 || e.keyCode == 68) {
            // Right or D
            if (snake.direction != 3) {
                snake.direction = 1;
            }
        } else if (e.keyCode == 40 || e.keyCode == 83) {
            // Down or S
            if (snake.direction != 0) {
                snake.direction = 2;
            }
        }
    }

    // Call init to start the game
    init();

    document.getElementById("moveDown").onclick = function () {
        if (gameover) {
            tryNewGame();
        }
        if (snake.direction != 0) {
            snake.direction = 2;
        }

    };
    document.getElementById("moveUp").onclick = function () {
        if (gameover) {
            tryNewGame();
        }
        if (snake.direction != 2) {
            snake.direction = 0;
        }

    };
    document.getElementById("moveLeft").onclick = function () {
        if (gameover) {
            tryNewGame();
        }
        if (snake.direction != 1) {
            snake.direction = 3;
        }
    };
    document.getElementById("moveRight").onclick = function () {
        if (gameover) {
            tryNewGame();
        }
        if (snake.direction != 3) {
            snake.direction = 1;
        }
    };

    document.getElementById("play").onclick = function () {
        if (gameover) {
            tryNewGame();
        }
        $('#start-block').css("display", "none");
        $('#canvas-block').css("display", "block");
    };

    document.getElementById("sound-on").onclick = function () {
        $('#sound-on').css("display", "none");
        $('#sound-off').css("display", "block");
        document.getElementById("audio").muted = true;
    };

    document.getElementById("sound-off").onclick = function () {
        $('#sound-off').css("display", "none");
        $('#sound-on').css("display", "block");
        document.getElementById("audio").muted = false;
    };
};