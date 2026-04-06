module.exports = {
  
  extractOwnerName(text) {
    const match = text.match(/Owner[:\- ]+\s*(.*)/i);
    return match ? match[1].trim() : "";
  },

  extractAddress(text) {
    const match = text.match(/Address[:\- ]+\s*(.*)/i);
    return match ? match[1].trim() : "";
  },

  extractSurveyNumber(text) {
    const match = text.match(/(Survey\s*No\.?|Sur\.? No\.?)[:\- ]+\s*([A-Za-z0-9\-\/]+)/i);
    return match ? match[2] : "";
  },

  extractArea(text) {
    const match = text.match(/Area[:\- ]+\s*([\d,\.]+\s*(sqft|sqm|acres)?)/i);
    return match ? match[1] : "";
  },

  extractRegistrationDate(text) {
    const match = text.match(/Registration\s*Date[:\- ]+\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i);
    return match ? match[1] : "";
  }

};