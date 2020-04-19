var ss = SpreadsheetApp.getActiveSpreadsheet();

var sheetConfig = ss.getSheetByName('config');
var sheetUser   = ss.getSheetByName('user');

var numRowUser = sheetUser.getLastRow();

var configLine = getConfig(2);

var LINE_CHANNEL_ACCESS_TOKEN   = configLine.ChannelAccessToken;
var LINE_HEADERS = {'Content-Type': 'application/json; charset=UTF-8', 'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN,};

/* Other functions */

// To get config JSON
function getConfig(rowIndex)
{
    return JSON.parse( sheetConfig.getRange(rowIndex, 2).getValue() );
}

// To get a random number
function getRandomNumer(lower, upper)
{
    return Math.floor(Math.random()*(upper - lower)) + lower;
}

function getCheckAnswer(uid, numberInput, replyToken)
{

    var number = getGameNumber(uid);
    var interval = getGameInterval(uid);

    var returnStr = "";

    var intervalNew = {upper: interval.upper, lower: interval.lower};

    var ifBingo = number === numberInput;

    var ifBingoNext = numberInput === interval.upper-1 && numberInput === interval.lower+1;

    var ifInInterval = numberInput < interval.upper && numberInput > interval.lower;

    if(ifBingo){

        returnStr = "Bingo!!!!!";

        clearGame(uid);

    } else if(ifBingoNext) {

        returnStr += (number+1) + "~" + (number-1);

        returnStr += "\nNext Bingo!!!!!";

        clearGame(uid);

    } else if(ifInInterval) {

        // Valid number

        if ( number > numberInput){

            intervalNew.lower = numberInput;

        } else {

            // number < numberInput

            intervalNew.upper = numberInput;

        }

        setGameInterval(uid, intervalNew);

        returnStr += intervalNew.upper + "~" + intervalNew.lower;

    } else {

        // Not valid number which is out of interval

        returnStr += "請回答此區間之數字：" + intervalNew.upper + "~" + intervalNew.lower;

    }

    return returnStr;

}

// Webhook main function
function doPost(e) {

    var eventObject = JSON.parse(e.postData.contents).events[0];

    var replyToken  = eventObject.replyToken;
    var uid         = eventObject.source.userId;
    var type        = eventObject.type;

    addUser(uid);

    switch(type){

        case 'message':

            var arguments = eventObject.message.text.split(':');

            if(arguments.length > 1){

                var command = arguments[0];

                var subcommand = arguments[1];

                switch(command){

                    case 'game':
                    default:

                        switch(subcommand){

                            case 'start':

                                setGameNumber(uid);
                                setGameInterval(uid, {lower: 1, upper: 999});

                                replySimpleMessage(replyToken, "數字已選定，遊戲開始！");

                                break;

                            case 'number':

                                var number = getGameNumber(uid);

                                replySimpleMessage(replyToken, "數字：" + number);

                                break;

                            case 'interval':

                                var interval = getGameInterval(uid);

                                var answer = interval.upper + "~" + interval.lower;

                                replySimpleMessage(replyToken, answer);

                                break;

                        }

                        break;

                }

            } else {

                var number = parseInt(arguments[0]);

                var answer = getCheckAnswer(uid, number, replyToken);

                replySimpleMessage(replyToken, answer);

            }

            break;

        case 'follow':

            break;

        default:

            break;

    }

}

/* DB functions */

function setGameNumber(uid){

    clearGame(uid);

    var userRowIndex = getUserRowIndex(uid);

    var number = getRandomNumer(1, 999);

    sheetUser.getRange(userRowIndex, 2).setValue( JSON.stringify(number) );

}

function getGameNumber(uid){

    var userRowIndex = getUserRowIndex(uid);

    var gameNumber = parseInt(JSON.parse( sheetUser.getRange(userRowIndex, 2).getValue() ));

    return gameNumber;

}

function setGameInterval(uid, interval){

    var userRowIndex = getUserRowIndex(uid);

    sheetUser.getRange(userRowIndex, 3).setValue( JSON.stringify(interval) ) ;

}

function getGameInterval(uid){

    var userRowIndex = getUserRowIndex(uid);

    var gameInterval = JSON.parse( sheetUser.getRange(userRowIndex, 3).getValue() );

    return gameInterval;

}

function clearGame(uid){

    var userRowIndex = getUserRowIndex(uid);

    sheetUser.getRange(userRowIndex, 2, 1, 2).setValue("");

}

// To add a uid
function addUser(uid){

    // Check if given uid exist in user sheet

    var ifExist = getUserRowIndex(uid) > 0 ? true : false;

    if(!ifExist){

        sheetUser.appendRow([uid, "", ""]);

    }

}

// To get row index of given uid in user sheet
function getUserRowIndex(uid){

    var rowIndexUser = 0;

    userRows = sheetUser.getRange(2, 1, numRowUser-1, 1).getValues();

    for(index in userRows) {

        if(userRows[index][0] == uid) {

            rowIndexUser = parseInt(index) + 2;

            break;

        }

    }

    return rowIndexUser;

}

/* LINE reply function*/

// To reply simple text message
function replySimpleMessage(replyToken, message){

    replyMessage(replyToken, [{type:"text",text:message}]);

}

// To reply message
function replyMessage(replyToken, messageList){

    UrlFetchApp.fetch(
        configLine.API.Reply,
        {
            headers: LINE_HEADERS,
            method: 'post',
            payload: JSON.stringify({
                replyToken: replyToken,
                messages: messageList
            })
        }
    );

}