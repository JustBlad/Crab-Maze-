
// Klasse für Buttons
class GardeningButton {
  PVector position;
  float width = 100;
  float height = 50;
  String label;
  
  //Konstruktor
  GardeningButton(float x, float y, String text) {
    position = new PVector(x, y);
    label = text;
  }
  //Textdisplay
  void display() {
    fill(220);
    rect(position.x, position.y, width, height);
    fill(0);
    textAlign(CENTER, CENTER);
    text(label, position.x + width/2, position.y + height/2);
  }
  //isOver Check
  boolean isMouseOver() {
    return mouseX >= position.x && mouseX <= position.x + width &&
      mouseY >= position.y && mouseY <= position.y + height;
  }
}
//Object Klasse
class GardenObject {
  PVector position;
  float size;
  boolean isSelected;
  
  GardenObject(float x, float y) {
    position = new PVector(x, y);
    size = 50;
    isSelected = false;
  }
  // Damit Gartenobjekte gemalt werden können
  void draw() {
  }
  
  boolean isMouseOver() {
    return mouseX >= position.x && mouseX <= position.x + size &&
           mouseY >= position.y && mouseY <= position.y + size;
  }
}
// Vererbung + Grass
class Grass extends GardenObject {
  Grass(float x, float y) {
    super(x, y);
  }
  
  void draw() {
    if(isSelected) {
      stroke(255,0,0);
    } else {
      stroke(0);
    }
    fill(34, 139, 34);
    rect(position.x, position.y, size, size);
  }
}
// Vererbung + Blume
class Flower extends GardenObject {
  color flowerColor;
  
  Flower(float x, float y) {
    super(x, y);  
    //Zufällige Farbe (nicht zu dunkel)
    flowerColor = color(random(100,255), random(100,255), random(100,255));
  }
  
  void draw() {
    if(isSelected) {
      stroke(255,0,0);
    } else {
      stroke(0);
    }
    fill(flowerColor);
    ellipse(position.x + size/2, position.y + size/2, size - 10, size - 10);
  }
}
//Array der Objekte und Buttons
ArrayList<GardeningButton> buttons;
ArrayList<GardenObject> gardenObjects;
String currentMode;
GardenObject selectedObject;

void setup() {
  size(1000, 800);
  background(255);
  //Erstelle 4 Buttons
  buttons = new ArrayList<GardeningButton>();
  buttons.add(new GardeningButton(50, 680, "Grass"));
  buttons.add(new GardeningButton(170, 680, "Flower"));
  buttons.add(new GardeningButton(290, 680, "Move"));
  buttons.add(new GardeningButton(410, 680, "Remove"));
  //Erstelle x Objects
  gardenObjects = new ArrayList<GardenObject>();
  currentMode = "";
  selectedObject = null;
}

void draw() {
  background(255);
  
//Abgrenzung der GUI
  fill(200);
  rect(0, 0, width, 660);
  
  // Objekte malen
  for(GardenObject obj : gardenObjects) {
    obj.draw();
  }
  
  // Buttons malen
  for(GardeningButton button : buttons) {
    button.display();
  }
 
}
// check für MousePress
void mousePressed() {
  
  for(GardeningButton button : buttons) {
    if(button.isMouseOver()) {
      currentMode = button.label;
      selectedObject = null;
      return;
    }
  }
  
  // Nur außerhalb des GUI's an
  if(mouseY < 660) {
    if(currentMode.equals("Grass")) {
      gardenObjects.add(new Grass(mouseX - 25, mouseY - 25));
    }
    
    if(currentMode.equals("Flower")) {
      gardenObjects.add(new Flower(mouseX - 25, mouseY - 25));
    }
    
    if(currentMode.equals("Move")) {
      if(selectedObject == null) {
        for(GardenObject obj : gardenObjects) {
          if(obj.isMouseOver()) {
            selectedObject = obj;
            obj.isSelected = true;
            break;
          }
        }
      } else {
        selectedObject.position.x = mouseX - 25;
        selectedObject.position.y = mouseY - 25;
        selectedObject.isSelected = false;
        selectedObject = null;
      }
    }
    
    if(currentMode.equals("Remove")) {
      for(int i = gardenObjects.size() - 1; i >= 0; i--) {
        if(gardenObjects.get(i).isMouseOver()) {
          gardenObjects.remove(i);
          break;
        }
      }
    }
  }
}
